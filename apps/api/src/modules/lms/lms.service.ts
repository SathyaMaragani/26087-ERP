import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLmsCourseDto } from './dto/create-lms-course.dto';
import { CreateLmsModuleDto } from './dto/create-lms-module.dto';
import { CreateLmsLessonDto } from './dto/create-lms-lesson.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';

@Injectable()
export class LmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ----------------------------------------------------
  // LMS Courses
  // ----------------------------------------------------
  async createCourse(orgId: string, dto: CreateLmsCourseDto, user: AuthenticatedUser) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, organizationId: orgId },
    });

    if (!course) {
      throw new NotFoundException('Academic course not found in this institution');
    }

    const existing = await this.prisma.lmsCourse.findUnique({
      where: {
        organizationId_courseId: {
          organizationId: orgId,
          courseId: dto.courseId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('An LMS portal for this course already exists');
    }

    return this.prisma.lmsCourse.create({
      data: {
        organizationId: orgId,
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        isPublished: dto.isPublished ?? false,
        createdById: user.id,
      },
      include: {
        course: true,
      },
    });
  }

  async listCourses(orgId: string) {
    return this.prisma.lmsCourse.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          include: { department: true },
        },
        _count: {
          select: {
            modules: true,
            assignments: true,
          },
        },
      },
    });
  }

  async getCourseDetails(orgId: string, id: string) {
    const lmsCourse = await this.prisma.lmsCourse.findFirst({
      where: { id, organizationId: orgId },
      include: {
        course: {
          include: { department: true },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                orderIndex: true,
                contentType: true,
                isPublished: true,
              },
            },
          },
        },
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!lmsCourse) {
      throw new NotFoundException(`LMS course '${id}' not found in this institution`);
    }

    return lmsCourse;
  }

  // ----------------------------------------------------
  // LMS Modules & Lessons
  // ----------------------------------------------------
  async addModule(orgId: string, courseId: string, dto: CreateLmsModuleDto) {
    const course = await this.prisma.lmsCourse.findFirst({
      where: { id: courseId, organizationId: orgId },
    });
    if (!course) throw new NotFoundException('LMS course not found');

    return this.prisma.lmsModule.create({
      data: {
        organizationId: orgId,
        lmsCourseId: courseId,
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async addLesson(orgId: string, moduleId: string, dto: CreateLmsLessonDto) {
    const moduleItem = await this.prisma.lmsModule.findFirst({
      where: { id: moduleId, organizationId: orgId },
    });
    if (!moduleItem) throw new NotFoundException('Module not found in this institution');

    return this.prisma.lmsLesson.create({
      data: {
        organizationId: orgId,
        moduleId,
        title: dto.title,
        orderIndex: dto.orderIndex ?? 0,
        contentType: dto.contentType || 'BLOCKS',
        contentBlocks: dto.contentBlocks ?? [],
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async getLesson(orgId: string, lessonId: string, studentProfileId?: string) {
    const lesson = await this.prisma.lmsLesson.findFirst({
      where: { id: lessonId, organizationId: orgId },
      include: {
        module: {
          include: {
            lmsCourse: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson '${lessonId}' not found in this institution`);
    }

    let progress = null;
    if (studentProfileId) {
      progress = await this.prisma.lmsProgress.findUnique({
        where: {
          studentProfileId_lessonId: {
            studentProfileId,
            lessonId,
          },
        },
      });
    }

    return {
      ...lesson,
      studentProgress: progress,
    };
  }

  async recordProgress(
    orgId: string,
    lessonId: string,
    studentProfileId: string,
    completed: boolean,
    timeSpentSeconds = 0,
  ) {
    return this.prisma.lmsProgress.upsert({
      where: {
        studentProfileId_lessonId: {
          studentProfileId,
          lessonId,
        },
      },
      update: {
        completed,
        timeSpentSeconds: { increment: timeSpentSeconds },
        completedAt: completed ? new Date() : undefined,
      },
      create: {
        organizationId: orgId,
        studentProfileId,
        lessonId,
        completed,
        timeSpentSeconds,
        completedAt: completed ? new Date() : undefined,
      },
    });
  }

  // ----------------------------------------------------
  // Assignments & Submissions
  // ----------------------------------------------------
  async createAssignment(
    orgId: string,
    courseId: string,
    dto: CreateAssignmentDto,
    user: AuthenticatedUser,
  ) {
    const course = await this.prisma.lmsCourse.findFirst({
      where: { id: courseId, organizationId: orgId },
    });
    if (!course) throw new NotFoundException('LMS course not found');

    return this.prisma.lmsAssignment.create({
      data: {
        organizationId: orgId,
        lmsCourseId: courseId,
        lessonId: dto.lessonId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        maxMarks: dto.maxMarks || 100,
        rubric: dto.rubric ?? [],
      },
    });
  }

  async submitAssignment(
    orgId: string,
    assignmentId: string,
    studentProfileId: string,
    dto: SubmitAssignmentDto,
  ) {
    const assignment = await this.prisma.lmsAssignment.findFirst({
      where: { id: assignmentId, organizationId: orgId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return this.prisma.lmsSubmission.upsert({
      where: {
        assignmentId_studentProfileId: {
          assignmentId,
          studentProfileId,
        },
      },
      update: {
        content: dto.content,
        fileUrl: dto.fileUrl,
        submittedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        assignmentId,
        studentProfileId,
        content: dto.content,
        fileUrl: dto.fileUrl,
      },
    });
  }

  async gradeSubmission(
    orgId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const submission = await this.prisma.lmsSubmission.findFirst({
      where: { id: submissionId, organizationId: orgId },
      include: { assignment: true },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found in this institution');
    }

    const updated = await this.prisma.lmsSubmission.update({
      where: { id: submissionId },
      data: {
        marksObtained: dto.marksObtained,
        feedback: dto.feedback,
        gradedById: user.id,
        gradedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'GRADE_CREATED',
      resource: 'LmsSubmission',
      resourceId: submissionId,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return updated;
  }

  // ----------------------------------------------------
  // Multilingual Lesson Translations
  // ----------------------------------------------------
  async addLessonTranslation(
    orgId: string,
    lessonId: string,
    dto: { language: string; title: string; contentBlocks?: any[]; audioUrl?: string; videoUrl?: string },
  ) {
    const lesson = await this.prisma.lmsLesson.findFirst({
      where: { id: lessonId, organizationId: orgId },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.lessonTranslation.upsert({
      where: {
        lessonId_language: {
          lessonId: lesson.id,
          language: dto.language.toLowerCase(),
        },
      },
      update: {
        title: dto.title,
        contentBlocks: dto.contentBlocks || [],
        audioUrl: dto.audioUrl,
        videoUrl: dto.videoUrl,
      },
      create: {
        lessonId: lesson.id,
        language: dto.language.toLowerCase(),
        title: dto.title,
        contentBlocks: dto.contentBlocks || [],
        audioUrl: dto.audioUrl,
        videoUrl: dto.videoUrl,
      },
    });
  }

  async getLessonTranslation(orgId: string, lessonId: string, language: string) {
    const translation = await this.prisma.lessonTranslation.findFirst({
      where: {
        lessonId,
        language: language.toLowerCase(),
        lesson: { organizationId: orgId },
      },
      include: { lesson: true },
    });

    if (!translation) {
      throw new NotFoundException(`Translation for language '${language}' not found`);
    }

    return translation;
  }

  // ----------------------------------------------------
  // Offline Learning Sync (Idempotent from PWA / IndexedDB)
  // ----------------------------------------------------
  async syncOfflineProgress(
    orgId: string,
    user: AuthenticatedUser,
    items: { lessonId: string; timeSpentSeconds?: number; completedAt?: string }[],
  ) {
    // Find student or trainee profile
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: user.id, organizationId: orgId },
    });

    if (!student) {
      // For trainee or external learner without traditional college student profile,
      // return success acknowledge with items received
      return {
        success: true,
        syncedCount: items.length,
        itemsSynced: items.map((i) => i.lessonId),
      };
    }

    const synced = [];
    for (const item of items) {
      const record = await this.prisma.lmsProgress.upsert({
        where: {
          studentProfileId_lessonId: {
            studentProfileId: student.id,
            lessonId: item.lessonId,
          },
        },
        update: {
          completed: true,
          timeSpentSeconds: { increment: item.timeSpentSeconds || 0 },
          completedAt: item.completedAt ? new Date(item.completedAt) : new Date(),
        },
        create: {
          organizationId: orgId,
          studentProfileId: student.id,
          lessonId: item.lessonId,
          completed: true,
          timeSpentSeconds: item.timeSpentSeconds || 0,
          completedAt: item.completedAt ? new Date(item.completedAt) : new Date(),
        },
      });
      synced.push(record.id);
    }

    return {
      success: true,
      syncedCount: synced.length,
      itemsSynced: synced,
    };
  }
}
