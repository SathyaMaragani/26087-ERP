import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';
import * as bcrypt from 'bcrypt';

@Injectable()
export class FacultyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(orgId: string, dto: CreateFacultyDto, user: AuthenticatedUser, req?: AppRequest) {
    const existingCode = await this.prisma.facultyProfile.findFirst({
      where: {
        organizationId: orgId,
        employeeCode: dto.employeeCode,
      },
    });

    if (existingCode) {
      throw new ConflictException(`Employee code '${dto.employeeCode}' already exists in this institution`);
    }

    const dept = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, organizationId: orgId },
    });
    if (!dept) throw new NotFoundException('Department not found in this institution');

    let facultyUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    const facultyProfile = await this.prisma.$transaction(async (tx) => {
      if (!facultyUser) {
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('Faculty@123', salt);
        facultyUser = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            passwordHash: defaultPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });
      }

      await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: facultyUser.id,
          },
        },
        update: {
          role: Role.FACULTY,
          departmentId: dto.departmentId,
          status: 'ACTIVE',
        },
        create: {
          organizationId: orgId,
          userId: facultyUser.id,
          role: Role.FACULTY,
          departmentId: dto.departmentId,
          status: 'ACTIVE',
        },
      });

      return tx.facultyProfile.create({
        data: {
          organizationId: orgId,
          userId: facultyUser.id,
          employeeCode: dto.employeeCode,
          designation: dto.designation,
          qualification: dto.qualification,
          specialization: dto.specialization,
          departmentId: dto.departmentId,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          department: true,
        },
      });
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: orgId,
      action: 'FACULTY_CREATED',
      resource: 'FacultyProfile',
      resourceId: facultyProfile.id,
      newValues: dto,
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
      requestId: req?.requestId || 'SYSTEM',
    });

    return facultyProfile;
  }

  async findAll(orgId: string, departmentId?: string) {
    const where: any = { organizationId: orgId };
    if (departmentId) where.departmentId = departmentId;

    return this.prisma.facultyProfile.findMany({
      where,
      orderBy: { employeeCode: 'asc' },
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
        department: true,
        _count: {
          select: {
            courseAllocations: true,
          },
        },
      },
    });
  }

  async findOne(orgId: string, id: string) {
    const faculty = await this.prisma.facultyProfile.findFirst({
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
        department: true,
        courseAllocations: {
          include: {
            course: true,
            section: true,
            semester: true,
          },
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException(`Faculty '${id}' not found in this institution`);
    }

    return faculty;
  }
}
