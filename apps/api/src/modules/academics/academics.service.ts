import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { CreateProgrammeDto } from './dto/create-programme.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { AllocateCourseDto } from './dto/allocate-course.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ----------------------------------------------------
  // Departments
  // ----------------------------------------------------
  async createDepartment(
    orgId: string,
    dto: CreateDepartmentDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const existing = await this.prisma.department.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Department code '${dto.code}' already exists in this institution`);
    }

    const dept = await this.prisma.department.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        headUserId: dto.headUserId,
      },
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'DEPARTMENT_CREATED',
      resource: 'Department',
      resourceId: dept.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return dept;
  }

  async listDepartments(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            programmes: true,
            courses: true,
            facultyProfiles: true,
          },
        },
      },
    });
  }

  // ----------------------------------------------------
  // Academic Years
  // ----------------------------------------------------
  async createAcademicYear(
    orgId: string,
    dto: CreateAcademicYearDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const existing = await this.prisma.academicYear.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Academic year '${dto.name}' already exists in this institution`);
    }

    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { organizationId: orgId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const ay = await this.prisma.academicYear.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });

    return ay;
  }

  async listAcademicYears(orgId: string) {
    return this.prisma.academicYear.findMany({
      where: { organizationId: orgId },
      orderBy: { startDate: 'desc' },
      include: {
        semesters: true,
      },
    });
  }

  // ----------------------------------------------------
  // Programmes
  // ----------------------------------------------------
  async createProgramme(
    orgId: string,
    dto: CreateProgrammeDto,
    user: AuthenticatedUser,
    req?: AppRequest,
  ) {
    const existing = await this.prisma.programme.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Programme code '${dto.code}' already exists`);
    }

    const prog = await this.prisma.programme.create({
      data: {
        organizationId: orgId,
        departmentId: dto.departmentId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        degree: dto.degree || 'Degree',
        durationYears: dto.durationYears || 4,
        totalSemesters: dto.totalSemesters || 8,
      },
      include: {
        department: true,
      },
    });

    return prog;
  }

  async listProgrammes(orgId: string) {
    return this.prisma.programme.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        department: true,
        _count: {
          select: {
            batches: true,
            studentProfiles: true,
          },
        },
      },
    });
  }

  // ----------------------------------------------------
  // Batches & Sections
  // ----------------------------------------------------
  async createBatch(orgId: string, dto: CreateBatchDto) {
    return this.prisma.batch.create({
      data: {
        organizationId: orgId,
        programmeId: dto.programmeId,
        academicYearId: dto.academicYearId,
        name: dto.name,
        cohortYear: dto.cohortYear,
      },
      include: {
        programme: true,
        academicYear: true,
      },
    });
  }

  async listBatches(orgId: string) {
    return this.prisma.batch.findMany({
      where: { organizationId: orgId },
      orderBy: { cohortYear: 'desc' },
      include: {
        programme: true,
        sections: true,
        _count: {
          select: {
            studentProfiles: true,
          },
        },
      },
    });
  }

  async createSection(orgId: string, dto: CreateSectionDto) {
    return this.prisma.section.create({
      data: {
        organizationId: orgId,
        batchId: dto.batchId,
        semesterId: dto.semesterId,
        name: dto.name,
        capacity: dto.capacity || 60,
      },
      include: {
        batch: true,
      },
    });
  }

  async listSections(orgId: string, batchId?: string) {
    const where: any = { organizationId: orgId };
    if (batchId) where.batchId = batchId;

    return this.prisma.section.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        batch: {
          include: {
            programme: true,
          },
        },
        _count: {
          select: {
            studentProfiles: true,
            courseAllocations: true,
          },
        },
      },
    });
  }

  // ----------------------------------------------------
  // Courses
  // ----------------------------------------------------
  async createCourse(orgId: string, dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Course code '${dto.code}' already exists in this institution`);
    }

    return this.prisma.course.create({
      data: {
        organizationId: orgId,
        departmentId: dto.departmentId,
        code: dto.code.toUpperCase(),
        name: dto.name,
        credits: dto.credits || 3,
        type: dto.type || 'CORE',
        description: dto.description,
        syllabusUrl: dto.syllabusUrl,
      },
      include: {
        department: true,
      },
    });
  }

  async listCourses(orgId: string) {
    return this.prisma.course.findMany({
      where: { organizationId: orgId },
      orderBy: { code: 'asc' },
      include: {
        department: true,
        _count: {
          select: {
            courseAllocations: true,
            lmsCourses: true,
          },
        },
      },
    });
  }

  // ----------------------------------------------------
  // Course Allocations
  // ----------------------------------------------------
  async allocateCourse(orgId: string, dto: AllocateCourseDto) {
    // Composite tenant verification to ensure no cross-tenant foreign key breach
    const [course, faculty, section] = await Promise.all([
      this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId: orgId } }),
      this.prisma.facultyProfile.findFirst({ where: { id: dto.facultyId, organizationId: orgId } }),
      this.prisma.section.findFirst({ where: { id: dto.sectionId, organizationId: orgId } }),
    ]);

    if (!course) throw new NotFoundException('Course not found in this institution');
    if (!faculty) throw new NotFoundException('Faculty profile not found in this institution');
    if (!section) throw new NotFoundException('Section not found in this institution');

    return this.prisma.courseAllocation.upsert({
      where: {
        organizationId_courseId_sectionId_semesterId_academicYearId: {
          organizationId: orgId,
          courseId: dto.courseId,
          sectionId: dto.sectionId,
          semesterId: dto.semesterId,
          academicYearId: dto.academicYearId,
        },
      },
      update: {
        facultyId: dto.facultyId,
        status: 'ACTIVE',
      },
      create: {
        organizationId: orgId,
        courseId: dto.courseId,
        facultyId: dto.facultyId,
        sectionId: dto.sectionId,
        semesterId: dto.semesterId,
        academicYearId: dto.academicYearId,
        status: 'ACTIVE',
      },
      include: {
        course: true,
        faculty: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        section: true,
      },
    });
  }

  async listAllocations(orgId: string, facultyId?: string) {
    const where: any = { organizationId: orgId };
    if (facultyId) where.facultyId = facultyId;

    return this.prisma.courseAllocation.findMany({
      where,
      include: {
        course: true,
        faculty: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        section: true,
        semester: true,
        academicYear: true,
      },
    });
  }
}
