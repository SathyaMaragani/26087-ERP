import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Notifications & Alerts')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @ApiOperation({ summary: 'Send in-app notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification dispatched' })
  @Post()
  async create(@Body() dto: CreateNotificationDto, @Req() req: AppRequest) {
    return this.notifService.create(dto, req);
  }

  @ApiOperation({ summary: 'Get current user notifications' })
  @Get('my')
  async getMy(@Req() req: AppRequest) {
    return this.notifService.getMy(req);
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  async getUnreadCount(@Req() req: AppRequest) {
    return this.notifService.getUnreadCount(req);
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: AppRequest) {
    return this.notifService.markAsRead(id, req);
  }
}
