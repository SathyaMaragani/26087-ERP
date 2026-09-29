import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(orgId: string, dto: CreateStudentDto, user: AuthenticatedUser, req?: AppRequest) {
    const existingEnrollment = await this.prisma.studentProfile.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { enrollmentNumber: dto.enrollmentNumber },
          { rollNumber: dto.rollNumber },
        ],
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(
        `A student with enrollment number '${dto.enrollmentNumber}' or roll number '${dto.rollNumber}' already exists in this institution`,
      );
    }

    // Verify programme and batch belong to this institution
    const [prog, batch] = await Promise.all([
      this.prisma.programme.findFirst({ where: { id: dto.programmeId, organizationId: orgId } }),
      this.prisma.batch.findFirst({ where: { id: dto.batchId, organizationId: orgId } }),
    ]);

    if (!prog) throw new NotFoundException('Programme not found in this institution');
    if (!batch) throw new NotFoundException('Batch not found in this institution');

    // Find or create User
    let studentUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const studentProfile = await this.prisma.$transaction(async (tx) => {
      if (!studentUser) {
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('Student@123', salt);
        studentUser = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash: defaultPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      // Add or verify membership
      await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: studentUser.id,
          },
        },
        update: {
          role: Role.STUDENT,
          status: 'ACTIVE',
        },
        create: {
          organizationId: orgId,
          userId: studentUser.id,
          role: Role.STUDENT,
          status: 'ACTIVE',
        },
      });

      return tx.studentProfile.create({
        data: {
          organizationId: orgId,
          userId: studentUser.id,
          enrollmentNumber: dto.enrollmentNumber,
          rollNumber: dto.rollNumber,
          programmeId: dto.programmeId,
          batchId: dto.batchId,
          sectionId: dto.sectionId,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          address: dto.address,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          guardianEmail: dto.guardianEmail,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          programme: true,
          batch: true,
          section: true,
        },
      });
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'STUDENT_CREATED',
      resource: 'StudentProfile',
      resourceId: studentProfile.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return studentProfile;
  }

  async findAll(
    orgId: string,
    params: {
      batchId?: string;
      sectionId?: string;
      programmeId?: string;
      search?: string;
      limit?: number;
      page?: number;
    },
  ) {
    const limit = params.limit || 20;
    const page = params.page || 1;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: orgId };

    if (params.batchId) where.batchId = params.batchId;
    if (params.sectionId) where.sectionId = params.sectionId;
    if (params.programmeId) where.programmeId = params.programmeId;

    if (params.search) {
      where.OR = [
        { enrollmentNumber: { contains: params.search, mode: 'insensitive' } },
        { rollNumber: { contains: params.search, mode: 'insensitive' } },
        { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, students] = await Promise.all([
      this.prisma.studentProfile.count({ where }),
      this.prisma.studentProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { rollNumber: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          programme: true,
          batch: true,
          section: true,
        },
      }),
    ]);

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(orgId: string, id: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
        programme: {
          include: { department: true },
        },
        batch: true,
        section: true,
        gradeResults: {
          include: { course: true, semester: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            attendanceRecords: true,
            lmsSubmissions: true,
            assessmentAttempts: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student '${id}' not found in this institution`);
    }

    // Compute attendance percentage
    const [totalAttendance, presentAttendance] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { studentProfileId: id, organizationId: orgId },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          studentProfileId: id,
          organizationId: orgId,
          status: { in: ['PRESENT', 'LATE'] },
        },
      }),
    ]);

    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : 100;

    return {
      ...student,
      metrics: {
        attendanceRate,
        totalClassesAttended: presentAttendance,
        totalClassesConducted: totalAttendance,
      },
    };
  }

  async getTimeline(orgId: string, id: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!student) {
      throw new NotFoundException(`Student '${id}' not found in this institution`);
    }

    const [attendance, submissions, attempts, progress] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { studentProfileId: id, organizationId: orgId },
        take: 15,
        orderBy: { markedAt: 'desc' },
        include: {
          session: {
            include: {
              courseAllocation: {
                include: { course: true },
              },
            },
          },
        },
      }),
      this.prisma.lmsSubmission.findMany({
        where: { studentProfileId: id, organizationId: orgId },
        take: 15,
        orderBy: { submittedAt: 'desc' },
        include: {
          assignment: {
            include: { lmsCourse: true },
          },
        },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { studentProfileId: id, organizationId: orgId },
        take: 15,
        orderBy: { submittedAt: 'desc' },
        include: {
          assessment: {
            include: { course: true },
          },
        },
      }),
      this.prisma.lmsProgress.findMany({
        where: { studentProfileId: id, organizationId: orgId, completed: true },
        take: 15,
        orderBy: { completedAt: 'desc' },
        include: {
          lesson: {
            include: { module: { include: { lmsCourse: true } } },
          },
        },
      }),
    ]);

    const events: Array<{
      type: string;
      title: string;
      description?: string;
      timestamp: Date;
      icon: string;
      metadata?: any;
    }> = [];

    for (const a of attendance) {
      events.push({
        type: 'ATTENDANCE',
        title: `${a.status === 'PRESENT' ? 'Attended' : a.status} ${a.session.courseAllocation.course.name}`,
        description: `Session slot: ${a.session.slot} (${a.session.type})`,
        timestamp: a.markedAt,
        icon: a.status === 'PRESENT' ? 'check-circle' : 'x-circle',
        metadata: { status: a.status, courseCode: a.session.courseAllocation.course.code },
      });
    }

    for (const s of submissions) {
      events.push({
        type: 'ASSIGNMENT_SUBMITTED',
        title: `Submitted ${s.assignment.title}`,
        description: s.marksObtained !== null ? `Graded: ${s.marksObtained}/${s.assignment.maxMarks}` : 'Pending evaluation',
        timestamp: s.submittedAt,
        icon: 'file-text',
        metadata: { marks: s.marksObtained, maxMarks: s.assignment.maxMarks },
      });
    }

    for (const at of attempts) {
      if (at.submittedAt) {
        events.push({
          type: 'ASSESSMENT_ATTEMPT',
          title: `Completed ${at.assessment.title} (${at.assessment.course.code})`,
          description: at.score !== null ? `Score: ${at.score}/${at.assessment.totalMarks}` : 'Submitted',
          timestamp: at.submittedAt,
          icon: 'award',
          metadata: { score: at.score, totalMarks: at.assessment.totalMarks },
        });
      }
    }

    for (const p of progress) {
      if (p.completedAt) {
        events.push({
          type: 'LESSON_COMPLETED',
          title: `Finished Lesson: ${p.lesson.title}`,
          description: `Course: ${p.lesson.module.lmsCourse.title}`,
          timestamp: p.completedAt,
          icon: 'book-open',
          metadata: { lessonId: p.lessonId },
        });
      }
    }

    events.push({
      type: 'ENROLLMENT',
      title: 'Enrolled in Academic Programme',
      description: `Enrollment: ${student.enrollmentNumber} | Roll: ${student.rollNumber}`,
      timestamp: student.createdAt,
      icon: 'user-check',
      metadata: { enrollmentNumber: student.enrollmentNumber },
    });

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return events;
  }

  async update(orgId: string, id: string, dto: UpdateStudentDto, user: AuthenticatedUser, req?: AppRequest) {
    const existing = await this.prisma.studentProfile.findFirst({
      where: { id, organizationId: orgId },
      include: { user: true },
    });

    if (!existing) {
      throw new NotFoundException(`Student '${id}' not found in this institution`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            firstName: dto.firstName ?? existing.user.firstName,
            lastName: dto.lastName ?? existing.user.lastName,
          },
        });
      }

      return tx.studentProfile.update({
        where: { id },
        data: {
          sectionId: dto.sectionId,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          address: dto.address,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          guardianEmail: dto.guardianEmail,
        },
        include: {
          user: true,
          section: true,
        },
      });
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'STUDENT_UPDATED',
      resource: 'StudentProfile',
      resourceId: id,
      oldValues: existing,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return updated;
  }
}
