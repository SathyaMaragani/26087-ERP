import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { QrAttendanceProvider } from './providers/qr-attendance.provider';
import { FaceAttendanceProvider } from './providers/face-attendance.provider';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, QrAttendanceProvider, FaceAttendanceProvider],
  exports: [AttendanceService, QrAttendanceProvider, FaceAttendanceProvider],
})
export class AttendanceModule {}
