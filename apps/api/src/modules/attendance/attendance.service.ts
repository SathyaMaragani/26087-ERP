import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAttendanceSessionDto } from './dto/create-session.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { AttendanceMethod } from '@erplms/types';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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
}
