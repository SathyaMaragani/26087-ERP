import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProgrammeDto, CreateBatchDto } from './dto/create-programme.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class ProgrammesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateProgrammeDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }

    const existing = await this.prisma.trainingProgramme.findUnique({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: dto.code,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Programme with code '${dto.code}' already exists`);
    }

    const programme = await this.prisma.trainingProgramme.create({
      data: {
        organizationId: orgId,
        code: dto.code,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        targetAudience: dto.targetAudience,
        mode: dto.mode || 'OFFLINE',
        durationDays: dto.durationDays || 5,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity || 50,
        location: dto.location,
        eligibilityCriteria: dto.eligibilityCriteria,
        hostelRequired: dto.hostelRequired || false,
        status: dto.status || 'UPCOMING',
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINING_PROGRAMME_CREATED',
      resource: 'TrainingProgramme',
      resourceId: programme.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return programme;
  }

  async findAll(query: { category?: string; status?: any; mode?: any }, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.trainingProgramme.findMany({
      where: {
        organizationId: orgId,
        ...(query.category && { category: query.category }),
        ...(query.status && { status: query.status }),
        ...(query.mode && { mode: query.mode }),
      },
      include: {
        _count: {
          select: {
            batches: true,
            registrations: true,
            certificates: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, req: AppRequest) {
    const orgId = req.tenantId;
    const programme = await this.prisma.trainingProgramme.findFirst({
      where: { id, organizationId: orgId },
      include: {
        batches: {
          include: {
            trainer: {
              include: { user: true },
            },
            _count: { select: { registrations: true, sessions: true } },
          },
        },
        registrations: {
          include: {
            trainee: {
              include: { user: true },
            },
          },
        },
        logisticsItems: true,
      },
    });

    if (!programme) {
      throw new NotFoundException(`Training Programme not found`);
    }

    return programme;
  }

  async update(id: string, dto: Partial<CreateProgrammeDto>, req: AppRequest) {
    const orgId = req.tenantId;
    const existing = await this.findOne(id, req);

    const updated = await this.prisma.trainingProgramme.update({
      where: { id: existing.id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.status && { status: dto.status }),
        ...(dto.capacity && { capacity: dto.capacity }),
        ...(dto.location && { location: dto.location }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.hostelRequired !== undefined && { hostelRequired: dto.hostelRequired }),
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINING_PROGRAMME_UPDATED',
      resource: 'TrainingProgramme',
      resourceId: updated.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return updated;
  }

  async createBatch(programmeId: string, dto: CreateBatchDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }

    const programme = await this.findOne(programmeId, req);

    const existing = await this.prisma.programmeBatch.findUnique({
      where: {
        organizationId_programmeId_batchCode: {
          organizationId: orgId,
          programmeId: programme.id,
          batchCode: dto.batchCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Batch with code '${dto.batchCode}' already exists for this programme`);
    }

    const batch = await this.prisma.programmeBatch.create({
      data: {
        organizationId: orgId,
        programmeId: programme.id,
        batchCode: dto.batchCode,
        name: dto.name,
        trainerId: dto.trainerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity || 30,
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'PROGRAMME_BATCH_CREATED',
      resource: 'ProgrammeBatch',
      resourceId: batch.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return batch;
  }

  async getBatches(programmeId: string, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.programmeBatch.findMany({
      where: { programmeId, organizationId: orgId },
      include: {
        trainer: {
          include: { user: true },
        },
        _count: {
          select: { registrations: true, sessions: true },
        },
      },
    });
  }

  async getRegistrations(programmeId: string, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.programmeRegistration.findMany({
      where: { programmeId, organizationId: orgId },
      include: {
        trainee: { include: { user: true } },
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getNominations(programmeId: string, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.programmeRegistration.findMany({
      where: {
        programmeId,
        organizationId: orgId,
        nominationType: 'INSTITUTIONAL',
      },
      include: {
        trainee: { include: { user: true } },
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
