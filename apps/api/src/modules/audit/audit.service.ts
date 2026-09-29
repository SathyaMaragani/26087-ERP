import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditEventPayload } from '@erplms/types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(payload: AuditEventPayload) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          organizationId: payload.organizationId,
          userId: payload.userId,
          action: payload.action,
          resource: payload.resource,
          resourceId: payload.resourceId,
          oldValues: payload.oldValues ?? undefined,
          newValues: payload.newValues ?? undefined,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
          requestId: payload.requestId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      // We don't fail business logic if audit log insertion encounters an error, but we log it
      return null;
    }
  }

  async getLogs(organizationId?: string, limit = 50, offset = 0) {
    const where: any = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
