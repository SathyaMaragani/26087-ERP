import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTraineeDto } from './dto/create-trainee.dto';
import { AppRequest } from '../../common/types/request-context';
import { TraineeType } from '@erplms/types';

@Injectable()
export class TraineesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTraineeDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }

    const existingCode = await this.prisma.traineeProfile.findUnique({
      where: {
        organizationId_traineeCode: {
          organizationId: orgId,
          traineeCode: dto.traineeCode,
        },
      },
    });

    if (existingCode) {
      throw new ConflictException(`Trainee with code '${dto.traineeCode}' already exists`);
    }

    const trainee = await this.prisma.traineeProfile.create({
      data: {
        organizationId: orgId,
        userId: dto.userId,
        traineeCode: dto.traineeCode,
        traineeType: dto.traineeType || TraineeType.RURAL_YOUTH,
        cooperativeName: dto.cooperativeName,
        pacsName: dto.pacsName,
        state: dto.state,
        district: dto.district,
        village: dto.village,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        educationLevel: dto.educationLevel,
        occupation: dto.occupation,
        annualIncome: dto.annualIncome,
        phone: dto.phone,
        aadhaarMasked: dto.aadhaarMasked,
      },
      include: {
        user: true,
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINEE_PROFILE_CREATED',
      resource: 'TraineeProfile',
      resourceId: trainee.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return trainee;
  }

  async findAll(
    query: { traineeType?: TraineeType; state?: string; district?: string; search?: string },
    req: AppRequest,
  ) {
    const orgId = req.tenantId;
    return this.prisma.traineeProfile.findMany({
      where: {
        organizationId: orgId,
        ...(query.traineeType && { traineeType: query.traineeType }),
        ...(query.state && { state: query.state }),
        ...(query.district && { district: query.district }),
        ...(query.search && {
          OR: [
            { traineeCode: { contains: query.search, mode: 'insensitive' } },
            { cooperativeName: { contains: query.search, mode: 'insensitive' } },
            { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        skills: {
          include: { skill: true },
        },
        _count: {
          select: {
            registrations: true,
            certificates: true,
            jobApplications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, req: AppRequest) {
    const orgId = req.tenantId;
    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: true,
        skills: {
          include: { skill: { include: { category: true } } },
        },
        registrations: {
          include: {
            programme: true,
            batch: true,
          },
        },
        certificates: {
          include: { programme: true },
        },
        hostelAllocations: {
          include: { room: { include: { hostel: true } } },
        },
        jobApplications: {
          include: { jobPosting: { include: { employer: true } } },
        },
        outcomes: true,
      },
    });

    if (!trainee) {
      throw new NotFoundException('Trainee profile not found');
    }

    return trainee;
  }

  async getSkills(id: string, req: AppRequest) {
    const trainee = await this.findOne(id, req);
    return this.prisma.traineeSkill.findMany({
      where: { traineeId: trainee.id },
      include: { skill: { include: { category: true } } },
    });
  }

  async getCertificates(id: string, req: AppRequest) {
    const trainee = await this.findOne(id, req);
    return this.prisma.certificate.findMany({
      where: { traineeId: trainee.id },
      include: { programme: true },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async getProgrammes(id: string, req: AppRequest) {
    const trainee = await this.findOne(id, req);
    return this.prisma.programmeRegistration.findMany({
      where: { traineeId: trainee.id },
      include: {
        programme: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: Partial<CreateTraineeDto>, req: AppRequest) {
    const orgId = req.tenantId;
    const trainee = await this.findOne(id, req);

    const updated = await this.prisma.traineeProfile.update({
      where: { id: trainee.id },
      data: {
        ...(dto.cooperativeName && { cooperativeName: dto.cooperativeName }),
        ...(dto.pacsName && { pacsName: dto.pacsName }),
        ...(dto.state && { state: dto.state }),
        ...(dto.district && { district: dto.district }),
        ...(dto.village && { village: dto.village }),
        ...(dto.occupation && { occupation: dto.occupation }),
        ...(dto.educationLevel && { educationLevel: dto.educationLevel }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.annualIncome && { annualIncome: dto.annualIncome }),
      },
      include: { user: true },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINEE_PROFILE_UPDATED',
      resource: 'TraineeProfile',
      resourceId: updated.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return updated;
  }
}
