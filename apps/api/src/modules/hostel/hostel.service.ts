import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateHostelDto, CreateHostelRoomDto, AllocateBedDto } from './dto/hostel.dto';
import { AppRequest } from '../../common/types/request-context';
import { HostelAllocationStatus } from '@erplms/types';

@Injectable()
export class HostelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createHostel(dto: CreateHostelDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    const hostel = await this.prisma.hostel.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        building: dto.building,
        gender: dto.gender || 'ALL',
        totalRooms: dto.totalRooms || 20,
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'HOSTEL_CREATED',
      resource: 'Hostel',
      resourceId: hostel.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return hostel;
  }

  async getHostels(req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.hostel.findMany({
      where: { organizationId: orgId },
      include: {
        rooms: {
          select: {
            id: true,
            roomNumber: true,
            floor: true,
            bedCapacity: true,
            occupiedBeds: true,
            isUnderMaintenance: true,
          },
        },
      },
    });
  }

  async createRoom(hostelId: string, dto: CreateHostelRoomDto, req: AppRequest) {
    const orgId = req.tenantId;
    const hostel = await this.prisma.hostel.findFirst({
      where: { id: hostelId, organizationId: orgId },
    });
    if (!hostel) {
      throw new NotFoundException('Hostel not found');
    }

    const existing = await this.prisma.hostelRoom.findUnique({
      where: {
        hostelId_roomNumber: {
          hostelId: hostel.id,
          roomNumber: dto.roomNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Room '${dto.roomNumber}' already exists in this hostel`);
    }

    return this.prisma.hostelRoom.create({
      data: {
        hostelId: hostel.id,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        bedCapacity: dto.bedCapacity || 2,
      },
    });
  }

  async allocateBed(dto: AllocateBedDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    const room = await this.prisma.hostelRoom.findUnique({
      where: { id: dto.roomId },
      include: { hostel: true },
    });

    if (!room || room.hostel.organizationId !== orgId) {
      throw new NotFoundException('Hostel room not found');
    }

    if (room.isUnderMaintenance) {
      throw new BadRequestException('Room is currently under maintenance');
    }

    if (room.occupiedBeds >= room.bedCapacity) {
      throw new ConflictException('Room is fully occupied. No beds available');
    }

    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { id: dto.traineeId, organizationId: orgId },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.hostelAllocation.create({
        data: {
          organizationId: orgId,
          roomId: room.id,
          traineeId: trainee.id,
          checkInDate: new Date(dto.checkInDate),
          checkOutDate: new Date(dto.checkOutDate),
          status: HostelAllocationStatus.RESERVED,
        },
        include: {
          room: { include: { hostel: true } },
          trainee: { include: { user: true } },
        },
      });

      await tx.hostelRoom.update({
        where: { id: room.id },
        data: { occupiedBeds: { increment: 1 } },
      });

      return allocation;
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'HOSTEL_BED_ALLOCATED',
      resource: 'HostelAllocation',
      resourceId: result.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return result;
  }

  async checkIn(allocationId: string, req: AppRequest) {
    const orgId = req.tenantId;
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id: allocationId, organizationId: orgId },
    });
    if (!allocation) {
      throw new NotFoundException('Hostel allocation not found');
    }

    return this.prisma.hostelAllocation.update({
      where: { id: allocation.id },
      data: {
        status: HostelAllocationStatus.CHECKED_IN,
        actualCheckIn: new Date(),
      },
    });
  }

  async checkOut(allocationId: string, req: AppRequest) {
    const orgId = req.tenantId;
    const allocation = await this.prisma.hostelAllocation.findFirst({
      where: { id: allocationId, organizationId: orgId },
    });
    if (!allocation) {
      throw new NotFoundException('Hostel allocation not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.hostelAllocation.update({
        where: { id: allocation.id },
        data: {
          status: HostelAllocationStatus.CHECKED_OUT,
          actualCheckOut: new Date(),
        },
      });

      await tx.hostelRoom.update({
        where: { id: allocation.roomId },
        data: { occupiedBeds: { decrement: 1 } },
      });

      return updated;
    });
  }

  async getOccupancy(req: AppRequest) {
    const orgId = req.tenantId;
    const rooms = await this.prisma.hostelRoom.findMany({
      where: { hostel: { organizationId: orgId } },
    });

    const totalRooms = rooms.length;
    const maintenanceRooms = rooms.filter((r) => r.isUnderMaintenance).length;
    const totalBeds = rooms.reduce((acc, r) => acc + r.bedCapacity, 0);
    const occupiedBeds = rooms.reduce((acc, r) => acc + r.occupiedBeds, 0);
    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalRooms,
      maintenanceRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRatePercent: occupancyRate,
    };
  }
}
