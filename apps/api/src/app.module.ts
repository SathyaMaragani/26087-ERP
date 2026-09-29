import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { StudentsModule } from './modules/students/students.module';
import { FacultyModule } from './modules/faculty/faculty.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LmsModule } from './modules/lms/lms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { ProgrammesModule } from './modules/programmes/programmes.module';
import { NominationsModule } from './modules/nominations/nominations.module';
import { TraineesModule } from './modules/trainees/trainees.module';
import { TrainersModule } from './modules/trainers/trainers.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { HostelModule } from './modules/hostel/hostel.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { SkillsModule } from './modules/skills/skills.module';
import { CertificationsModule } from './modules/certifications/certifications.module';
import { EmploymentModule } from './modules/employment/employment.module';
import { CounsellingModule } from './modules/counselling/counselling.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';

import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { TenantResolutionMiddleware } from './common/middleware/tenant-resolution.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantIsolationGuard } from './common/guards/tenant-isolation.guard';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    OrganizationsModule,
    AcademicsModule,
    StudentsModule,
    FacultyModule,
    AttendanceModule,
    LmsModule,
    AnalyticsModule,
    HealthModule,
    ProgrammesModule,
    NominationsModule,
    TraineesModule,
    TrainersModule,
    TimetableModule,
    HostelModule,
    LogisticsModule,
    SkillsModule,
    CertificationsModule,
    EmploymentModule,
    CounsellingModule,
    NotificationsModule,
    DocumentsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantIsolationGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, TenantResolutionMiddleware)
      .forRoutes('*');
  }
}
