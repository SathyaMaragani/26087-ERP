import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLogisticsItemDto, UpdateLogisticsStatusDto } from './dto/logistics.dto';
import { AppRequest } from '../../common/types/request-context';
import { LogisticsStatus } from '@erplms/types';

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateLogisticsItemDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    if (dto.programmeId) {
      const programme = await this.prisma.trainingProgramme.findFirst({
        where: { id: dto.programmeId, organizationId: orgId },
      });
      if (!programme) {
        throw new NotFoundException('Training Programme not found');
      }
    }

    const item = await this.prisma.logisticsItem.create({
      data: {
        organizationId: orgId,
        programmeId: dto.programmeId,
        category: dto.category,
        title: dto.title,
        quantity: dto.quantity || 1,
        vendorName: dto.vendorName,
        cost: dto.cost,
        status: dto.status || LogisticsStatus.PENDING,
        remarks: dto.remarks,
      },
      include: { programme: true },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'LOGISTICS_ITEM_CREATED',
      resource: 'LogisticsItem',
      resourceId: item.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return item;
  }

  async findAll(query: { programmeId?: string; category?: string }, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.logisticsItem.findMany({
      where: {
        organizationId: orgId,
        ...(query.programmeId && { programmeId: query.programmeId }),
        ...(query.category && { category: query.category }),
      },
      include: { programme: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateLogisticsStatusDto, req: AppRequest) {
    const orgId = req.tenantId;
    const item = await this.prisma.logisticsItem.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!item) {
      throw new NotFoundException('Logistics item not found');
    }

    const updated = await this.prisma.logisticsItem.update({
      where: { id: item.id },
      data: {
        status: dto.status,
        ...(dto.remarks && { remarks: dto.remarks }),
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'LOGISTICS_STATUS_UPDATED',
      resource: 'LogisticsItem',
      resourceId: updated.id,
      oldValues: { status: item.status },
      newValues: { status: dto.status },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return updated;
  }
}
