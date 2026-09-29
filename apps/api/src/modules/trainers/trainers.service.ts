import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateTrainerDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context is required');
    }

    const existing = await this.prisma.trainerProfile.findUnique({
      where: {
        organizationId_trainerCode: {
          organizationId: orgId,
          trainerCode: dto.trainerCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Trainer with code '${dto.trainerCode}' already exists`);
    }

    const trainer = await this.prisma.trainerProfile.create({
      data: {
        organizationId: orgId,
        userId: dto.userId,
        trainerCode: dto.trainerCode,
        designation: dto.designation,
        specialization: dto.specialization,
        qualifications: dto.qualifications,
        experienceYears: dto.experienceYears || 0,
        bio: dto.bio,
      },
      include: { user: true },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINER_PROFILE_CREATED',
      resource: 'TrainerProfile',
      resourceId: trainer.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return trainer;
  }

  async findAll(query: { specialization?: string; status?: string }, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.trainerProfile.findMany({
      where: {
        organizationId: orgId,
        ...(query.specialization && {
          specialization: { contains: query.specialization, mode: 'insensitive' },
        }),
        ...(query.status && { status: query.status }),
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
        _count: {
          select: { batches: true, sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, req: AppRequest) {
    const orgId = req.tenantId;
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id, organizationId: orgId },
      include: {
        user: true,
        batches: {
          include: { programme: true },
        },
        sessions: {
          include: { batch: { include: { programme: true } } },
          orderBy: { sessionDate: 'asc' },
        },
      },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }

    return trainer;
  }
}
