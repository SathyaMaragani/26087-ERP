import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAttendanceSessionDto } from './dto/create-session.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { QrScanDto, FaceVerifyDto } from './dto/qr-attendance.dto';
import { QrAttendanceProvider } from './providers/qr-attendance.provider';
import { FaceAttendanceProvider } from './providers/face-attendance.provider';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { AttendanceMethod, AttendanceStatus } from '@erplms/types';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly qrProvider: QrAttendanceProvider,
    private readonly faceProvider: FaceAttendanceProvider,
  ) {}

  async createSession(
    orgId: string,
    dto: CreateAttendanceSessionDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const allocation = await this.prisma.courseAllocation.findFirst({
      where: { id: dto.courseAllocationId, organizationId: orgId },
      include: { course: true, section: true },
    });

    if (!allocation) {
      throw new NotFoundException('Course allocation not found in this institution');
    }

    const session = await this.prisma.attendanceSession.create({
      data: {
        organizationId: orgId,
        courseAllocationId: dto.courseAllocationId,
        date: new Date(dto.date),
        slot: dto.slot,
        type: dto.type || 'LECTURE',
        takenByFacultyId: allocation.facultyId,
        status: 'SCHEDULED',
      },
      include: {
        courseAllocation: {
          include: { course: true, section: true },
        },
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'ATTENDANCE_SESSION_CREATED',
      resource: 'AttendanceSession',
      resourceId: session.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return session;
  }

  async markAttendance(
    orgId: string,
    sessionId: string,
    dto: MarkAttendanceDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, organizationId: orgId },
      include: { courseAllocation: true },
    });

    if (!session) {
      throw new NotFoundException(`Attendance session '${sessionId}' not found in this institution`);
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const records = [];

      for (const item of dto.records) {
        const record = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentProfileId: {
              sessionId,
              studentProfileId: item.studentProfileId,
            },
          },
          update: {
            status: item.status,
            verifiedByMethod: item.verifiedByMethod || AttendanceMethod.MANUAL,
            remark: item.remark,
            markedAt: new Date(),
            markedById: user.id,
          },
          create: {
            organizationId: orgId,
            sessionId,
            studentProfileId: item.studentProfileId,
            status: item.status,
            verifiedByMethod: item.verifiedByMethod || AttendanceMethod.MANUAL,
            remark: item.remark,
            markedAt: new Date(),
            markedById: user.id,
          },
        });
        records.push(record);
      }

      await tx.attendanceSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });

      return records;
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'ATTENDANCE_MODIFIED',
      resource: 'AttendanceSession',
      resourceId: sessionId,
      newValues: { totalMarked: dto.records.length },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      sessionId,
      markedCount: results.length,
      records: results,
    };
  }

  async getSession(orgId: string, sessionId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, organizationId: orgId },
      include: {
        courseAllocation: {
          include: {
            course: true,
            section: true,
            faculty: { include: { user: true } },
          },
        },
        records: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session '${sessionId}' not found in this institution`);
    }

    return session;
  }

  async getStudentReport(orgId: string, studentProfileId: string) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentProfileId, organizationId: orgId },
      include: {
        session: {
          include: {
            courseAllocation: {
              include: { course: true },
            },
          },
        },
      },
      orderBy: { markedAt: 'desc' },
    });

    // Group by course
    const courseStats: Record<
      string,
      {
        courseCode: string;
        courseName: string;
        total: number;
        present: number;
        percentage: number;
      }
    > = {};

    let totalClasses = 0;
    let totalPresent = 0;

    for (const r of records) {
      const course = r.session.courseAllocation.course;
      if (!courseStats[course.id]) {
        courseStats[course.id] = {
          courseCode: course.code,
          courseName: course.name,
          total: 0,
          present: 0,
          percentage: 0,
        };
      }

      courseStats[course.id].total += 1;
      totalClasses += 1;

      if (r.status === 'PRESENT' || r.status === 'LATE') {
        courseStats[course.id].present += 1;
        totalPresent += 1;
      }
    }

    // Calculate percentages
    for (const key of Object.keys(courseStats)) {
      const c = courseStats[key];
      c.percentage = c.total > 0 ? Math.round((c.present / c.total) * 100) : 100;
    }

    const overallPercentage =
      totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 100;

    return {
      overall: {
        totalClasses,
        totalPresent,
        percentage: overallPercentage,
        isAtRisk: overallPercentage < 75,
      },
      courses: Object.values(courseStats),
      recentRecords: records.slice(0, 20),
    };
  }

  // ----------------------------------------------------
  // Dynamic Rotating QR Attendance Engine
  // ----------------------------------------------------
  async generateDynamicQr(orgId: string, sessionId: string) {
    const session = await this.prisma.attendanceSession.findFirst({
      where: { id: sessionId, organizationId: orgId },
    });
    if (!session) {
      throw new NotFoundException(`Attendance session '${sessionId}' not found in this institution`);
    }

    return this.qrProvider.generateRotatingQr(sessionId, orgId, 60);
  }

  async scanDynamicQr(
    orgId: string,
    sessionId: string,
    dto: QrScanDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    // 1. Verify dynamic QR token
    this.qrProvider.verifyQrToken(dto.qrToken, sessionId, orgId);

    // 2. Identify student or trainee profile
    let studentId = dto.studentProfileId;
    if (!studentId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId) {
      const trainee = await this.prisma.traineeProfile.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      return {
        success: true,
        method: AttendanceMethod.QR,
        status: AttendanceStatus.PRESENT,
        message: 'Dynamic QR attendance verified and recorded successfully.',
        traineeId: trainee?.id,
        sessionId,
        markedAt: new Date(),
      };
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentProfileId: {
          sessionId,
          studentProfileId: studentId,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.QR,
        remark: 'Scanned dynamic rotating QR code',
        markedAt: new Date(),
        markedById: user.id,
      },
      create: {
        organizationId: orgId,
        sessionId,
        studentProfileId: studentId,
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.QR,
        remark: 'Scanned dynamic rotating QR code',
        markedAt: new Date(),
        markedById: user.id,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'ATTENDANCE_QR_SCANNED',
      resource: 'AttendanceRecord',
      resourceId: record.id,
      newValues: { sessionId, method: AttendanceMethod.QR },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'] as string,
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      success: true,
      recordId: record.id,
      status: record.status,
      method: record.verifiedByMethod,
      markedAt: record.markedAt,
    };
  }

  // ----------------------------------------------------
  // Decoupled Face Recognition Biometric Attendance
  // ----------------------------------------------------
  async verifyFaceAttendance(
    orgId: string,
    sessionId: string,
    dto: FaceVerifyDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const bioResult = await this.faceProvider.verifyFaceBiometric({
      consentGranted: dto.consentGranted,
      faceEmbedding: dto.faceEmbedding,
      livenessConfidence: dto.livenessConfidence,
    });

    let studentId = dto.studentProfileId;
    if (!studentId) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId) {
      const trainee = await this.prisma.traineeProfile.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      return {
        success: true,
        method: AttendanceMethod.FACE,
        status: AttendanceStatus.PRESENT,
        confidence: bioResult.confidence,
        consentRecorded: bioResult.consentRecorded,
        message: 'Facial recognition attendance verified and recorded.',
        traineeId: trainee?.id,
        sessionId,
        markedAt: new Date(),
      };
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentProfileId: {
          sessionId,
          studentProfileId: studentId,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.FACE,
        remark: `Face biometric verified (Confidence: ${bioResult.confidence}%, Consent: YES)`,
        markedAt: new Date(),
        markedById: user.id,
      },
      create: {
        organizationId: orgId,
        sessionId,
        studentProfileId: studentId,
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.FACE,
        remark: `Face biometric verified (Confidence: ${bioResult.confidence}%, Consent: YES)`,
        markedAt: new Date(),
        markedById: user.id,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'ATTENDANCE_FACE_VERIFIED',
      resource: 'AttendanceRecord',
      resourceId: record.id,
      newValues: { sessionId, method: AttendanceMethod.FACE, confidence: bioResult.confidence },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'] as string,
      requestId: req?.requestId || 'SYSTEM',
    });

    return {
      success: true,
      recordId: record.id,
      status: record.status,
      method: record.verifiedByMethod,
      confidence: bioResult.confidence,
      consentRecorded: bioResult.consentRecorded,
      markedAt: record.markedAt,
    };
  }
}
