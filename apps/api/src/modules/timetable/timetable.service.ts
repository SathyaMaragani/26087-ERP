import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTrainingSessionDto } from './dto/create-session.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createSession(dto: CreateTrainingSessionDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be strictly before endTime');
    }

    // Verify batch belongs to tenant
    const batch = await this.prisma.programmeBatch.findFirst({
      where: { id: dto.batchId, organizationId: orgId },
    });
    if (!batch) {
      throw new NotFoundException('Programme Batch not found');
    }

    // Verify trainer belongs to tenant
    const trainer = await this.prisma.trainerProfile.findFirst({
      where: { id: dto.trainerId, organizationId: orgId },
    });
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    // Check all sessions scheduled for that date under the organization
    const targetDate = new Date(dto.sessionDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingSessions = await this.prisma.trainingSession.findMany({
      where: {
        organizationId: orgId,
        sessionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const isOverlap = (s1Start: string, s1End: string, s2Start: string, s2End: string) => {
      return s1Start < s2End && s2Start < s1End;
    };

    // 1. Trainer Conflict Check
    const trainerConflict = existingSessions.find(
      (s) => s.trainerId === dto.trainerId && isOverlap(s.startTime, s.endTime, dto.startTime, dto.endTime),
    );
    if (trainerConflict) {
      throw new ConflictException(
        `Trainer Conflict: Trainer is already scheduled for session '${trainerConflict.topic}' from ${trainerConflict.startTime} to ${trainerConflict.endTime}`,
      );
    }

    // 2. Room Conflict Check
    const roomConflict = existingSessions.find(
      (s) =>
        s.room.toLowerCase() === dto.room.toLowerCase() &&
        isOverlap(s.startTime, s.endTime, dto.startTime, dto.endTime),
    );
    if (roomConflict) {
      throw new ConflictException(
        `Room Conflict: Room '${dto.room}' is already booked from ${roomConflict.startTime} to ${roomConflict.endTime}`,
      );
    }

    // 3. Batch Conflict Check
    const batchConflict = existingSessions.find(
      (s) => s.batchId === dto.batchId && isOverlap(s.startTime, s.endTime, dto.startTime, dto.endTime),
    );
    if (batchConflict) {
      throw new ConflictException(
        `Batch Conflict: Batch already has session '${batchConflict.topic}' from ${batchConflict.startTime} to ${batchConflict.endTime}`,
      );
    }

    const session = await this.prisma.trainingSession.create({
      data: {
        organizationId: orgId,
        batchId: dto.batchId,
        trainerId: dto.trainerId,
        room: dto.room,
        sessionDate: targetDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        topic: dto.topic,
      },
      include: {
        batch: { include: { programme: true } },
        trainer: { include: { user: true } },
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINING_SESSION_SCHEDULED',
      resource: 'TrainingSession',
      resourceId: session.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return session;
  }

  async getSessions(
    query: { batchId?: string; trainerId?: string; date?: string },
    req: AppRequest,
  ) {
    const orgId = req.tenantId;
    let dateFilter = {};
    if (query.date) {
      const d = new Date(query.date);
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    return this.prisma.trainingSession.findMany({
      where: {
        organizationId: orgId,
        ...(query.batchId && { batchId: query.batchId }),
        ...(query.trainerId && { trainerId: query.trainerId }),
        ...(query.date && { sessionDate: dateFilter }),
      },
      include: {
        batch: { include: { programme: true } },
        trainer: { include: { user: true } },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getBatchSchedule(batchId: string, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.trainingSession.findMany({
      where: { batchId, organizationId: orgId },
      include: {
        trainer: { include: { user: true } },
      },
      orderBy: [{ sessionDate: 'asc' }, { startTime: 'asc' }],
    });
  }
}
