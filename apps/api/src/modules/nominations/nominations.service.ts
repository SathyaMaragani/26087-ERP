import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterProgrammeDto, UpdateNominationStatusDto } from './dto/nomination.dto';
import { AppRequest } from '../../common/types/request-context';
import { RegistrationStatus } from '@erplms/types';

@Injectable()
export class NominationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async registerSelf(dto: RegisterProgrammeDto, req: AppRequest) {
    const orgId = req.tenantId;
    const userId = req.user?.id;
    if (!orgId || !userId) {
      throw new BadRequestException('Organization and authenticated user are required');
    }

    // Verify programme exists
    const programme = await this.prisma.trainingProgramme.findFirst({
      where: { id: dto.programmeId, organizationId: orgId },
    });
    if (!programme) {
      throw new NotFoundException('Training Programme not found');
    }

    // Find or automatically create Trainee Profile for the user
    let trainee = await this.prisma.traineeProfile.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!trainee) {
      const code = `TRN-${Date.now().toString().slice(-6)}`;
      trainee = await this.prisma.traineeProfile.create({
        data: {
          organizationId: orgId,
          userId,
          traineeCode: code,
          phone: req.user?.email,
        },
      });
    }

    // Check duplicate
    const existing = await this.prisma.programmeRegistration.findUnique({
      where: {
        organizationId_programmeId_traineeId: {
          organizationId: orgId,
          programmeId: programme.id,
          traineeId: trainee.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already submitted a registration for this programme');
    }

    const registration = await this.prisma.programmeRegistration.create({
      data: {
        organizationId: orgId,
        programmeId: programme.id,
        traineeId: trainee.id,
        nominationType: dto.nominationType || 'SELF',
        nominatingOrgName: dto.nominatingOrgName,
        nominatingOfficer: dto.nominatingOfficer,
        status: RegistrationStatus.SUBMITTED,
        remarks: dto.remarks,
      },
      include: {
        programme: true,
        trainee: { include: { user: true } },
      },
    });

    await this.auditService.log({
      userId,
      organizationId: orgId,
      action: 'PROGRAMME_REGISTERED_SELF',
      resource: 'ProgrammeRegistration',
      resourceId: registration.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return registration;
  }

  async nominate(traineeId: string, dto: RegisterProgrammeDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { id: traineeId, organizationId: orgId },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const existing = await this.prisma.programmeRegistration.findUnique({
      where: {
        organizationId_programmeId_traineeId: {
          organizationId: orgId,
          programmeId: dto.programmeId,
          traineeId: trainee.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Trainee is already nominated/registered for this programme');
    }

    const registration = await this.prisma.programmeRegistration.create({
      data: {
        organizationId: orgId,
        programmeId: dto.programmeId,
        traineeId: trainee.id,
        nominationType: 'INSTITUTIONAL',
        nominatingOrgName: dto.nominatingOrgName,
        nominatingOfficer: dto.nominatingOfficer,
        status: RegistrationStatus.SUBMITTED,
        remarks: dto.remarks,
      },
      include: {
        programme: true,
        trainee: { include: { user: true } },
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINEE_NOMINATED_INSTITUTIONAL',
      resource: 'ProgrammeRegistration',
      resourceId: registration.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return registration;
  }

  async findAll(query: { programmeId?: string; status?: RegistrationStatus }, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.programmeRegistration.findMany({
      where: {
        organizationId: orgId,
        ...(query.programmeId && { programmeId: query.programmeId }),
        ...(query.status && { status: query.status }),
      },
      include: {
        programme: true,
        trainee: { include: { user: true } },
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMy(req: AppRequest) {
    const orgId = req.tenantId;
    const userId = req.user?.id;
    return this.prisma.programmeRegistration.findMany({
      where: {
        organizationId: orgId,
        trainee: { userId },
      },
      include: {
        programme: true,
        batch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateNominationStatusDto, req: AppRequest) {
    const orgId = req.tenantId;
    const registration = await this.prisma.programmeRegistration.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!registration) {
      throw new NotFoundException('Registration record not found');
    }

    const updated = await this.prisma.programmeRegistration.update({
      where: { id: registration.id },
      data: {
        status: dto.status,
        ...(dto.batchId && { batchId: dto.batchId }),
        ...(dto.remarks && { remarks: dto.remarks }),
        approvedById: req.user?.id,
        approvedAt: new Date(),
      },
      include: {
        programme: true,
        trainee: { include: { user: true } },
        batch: true,
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'NOMINATION_STATUS_UPDATED',
      resource: 'ProgrammeRegistration',
      resourceId: updated.id,
      oldValues: { status: registration.status, batchId: registration.batchId },
      newValues: { status: dto.status, batchId: dto.batchId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return updated;
  }
}
