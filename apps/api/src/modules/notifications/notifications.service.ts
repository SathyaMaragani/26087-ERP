import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificationDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    return this.prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type || 'INFO',
        link: dto.link,
      },
    });
  }

  async getMy(req: AppRequest) {
    const userId = req.user?.id;
    const orgId = req.tenantId;
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(orgId && { organizationId: orgId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(req: AppRequest) {
    const userId = req.user?.id;
    const orgId = req.tenantId;
    const count = await this.prisma.notification.count({
      where: {
        userId,
        read: false,
        ...(orgId && { organizationId: orgId }),
      },
    });

    return { unreadCount: count };
  }

  async markAsRead(id: string, req: AppRequest) {
    const userId = req.user?.id;
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }
}
