import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceSessionDto } from './dto/create-session.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { QrScanDto, FaceVerifyDto } from './dto/qr-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantIsolationGuard } from '../../common/guards/tenant-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';
import { Role } from '@erplms/types';

@ApiTags('Attendance Management')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'Schedule or create an attendance session for a class' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD, Role.FACULTY)
  @Post('sessions')
  async createSession(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.attendanceService.createSession(orgId, dto, user, req);
  }

  @ApiOperation({ summary: 'Record or update attendance records for a session' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.PRINCIPAL, Role.HOD, Role.FACULTY)
  @Post('sessions/:id/mark')
  async markAttendance(
    @CurrentTenant() orgId: string,
    @Param('id') sessionId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.attendanceService.markAttendance(orgId, sessionId, dto, user, req);
  }

  @ApiOperation({ summary: 'Get session details with full attendance roster' })
  @Get('sessions/:id')
  async getSession(
    @CurrentTenant() orgId: string,
    @Param('id') sessionId: string,
  ) {
    return this.attendanceService.getSession(orgId, sessionId);
  }

  @ApiOperation({ summary: 'Get student attendance summary and at-risk alert (<75%)' })
  @Get('students/:studentProfileId/summary')
  async getStudentReport(
    @CurrentTenant() orgId: string,
    @Param('studentProfileId') studentProfileId: string,
  ) {
    return this.attendanceService.getStudentReport(orgId, studentProfileId);
  }

  @ApiOperation({ summary: 'Generate dynamic rotating QR code for attendance session (trainer/faculty)' })
  @Roles(Role.SUPER_ADMIN, Role.INSTITUTION_ADMIN, Role.COORDINATOR, Role.TRAINER, Role.FACULTY)
  @Post('sessions/:id/qr-code')
  async generateDynamicQr(
    @CurrentTenant() orgId: string,
    @Param('id') sessionId: string,
  ) {
    return this.attendanceService.generateDynamicQr(orgId, sessionId);
  }

  @ApiOperation({ summary: 'Scan dynamic rotating QR code to record attendance (trainee/student)' })
  @Post('sessions/:id/qr-scan')
  async scanDynamicQr(
    @CurrentTenant() orgId: string,
    @Param('id') sessionId: string,
    @Body() dto: QrScanDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.attendanceService.scanDynamicQr(orgId, sessionId, dto, user, req);
  }

  @ApiOperation({ summary: 'Verify face recognition attendance with privacy consent enforcement' })
  @Post('sessions/:id/face-verify')
  async verifyFaceAttendance(
    @CurrentTenant() orgId: string,
    @Param('id') sessionId: string,
    @Body() dto: FaceVerifyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.attendanceService.verifyFaceAttendance(orgId, sessionId, dto, user, req);
  }
}
