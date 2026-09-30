import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to run seamlessly
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/docs'],
  });

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ['x-request-id', 'x-tenant-id'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('NCCT Digital Ecosystem - Cooperative Training & Rural Skill Development Platform')
    .setDescription(
      'National multi-tenant operating system integrating Training ERP, Multilingual LMS, Offline Sync, Dynamic QR Attendance, Hostel & Logistics, Skill Taxonomy, Verifiable Digital Certification, and Employment Exchange.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT/Refresh token rotation, lockout protection, and active tenant switching')
    .addTag('Organizations / Institutions', 'Multi-tenant institution hierarchy (NCCT, VAMNICOM, RICMs, ICMs)')
    .addTag('Training Programmes & Batches', 'Training programmes, modules, duration, and batch scheduling')
    .addTag('Online Registrations & Nominations', 'Self-registration and institutional nomination workflow')
    .addTag('Trainees & Rural Youth (Centralized Database)', 'Longitudinal profile for cooperative personnel & rural youth')
    .addTag('Trainers & Faculty Directory', 'Trainer directory, subject-matter expertise, and allocations')
    .addTag('Timetable & Training Sessions', 'Training sessions with conflict detection (room, trainer, batch)')
    .addTag('Hostel Management', 'Hostel accommodation, bed allocation, check-in/out, and occupancy tracking')
    .addTag('Logistics Management (Meals, Kits, Transport)', 'Training kits, meals, equipment, and transport fulfillment')
    .addTag('Rural & Cooperative Skills Taxonomy', 'Skill categories, competency levels, and verified skill badges')
    .addTag('Digital Certifications & QR Verification', 'Certificate issuance and public verification via a national-registry lookup and status check (not a cryptographic signature verification)')
    .addTag('Employment Exchange & Skill Matching', 'Job postings, algorithmic skill matching (%), and placement tracking')
    .addTag('Career Counseling & AI Recommendations', 'Controlled career assistant and personalized skill gap advice')
    .addTag('Attendance Management', 'Session scheduling, QR/manual marking, and at-risk monitoring')
    .addTag('LMS (Learning Management System)', 'Multilingual courses, modules, lesson translations, and offline sync')
    .addTag('Notifications & Alerts', 'In-app notification dispatch and unread counters')
    .addTag('Document & Object Storage Management', 'Document metadata, 25MB limits, and signed access URLs')
    .addTag('Analytics & Dashboards', 'NCCT National Command Center, institution KPIs, and trainee dashboards')
    .addTag('Audit Logs', 'Immutable audit trail of sensitive operations')
    .addTag('Health & System Diagnostics', 'System health and database readiness')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(`🚀 ERPLMS API is live at http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Documentation at http://localhost:${port}/api/docs`);
  logger.log(`❤️  Health Check at http://localhost:${port}/health`);
  logger.log(`=======================================================`);
}

bootstrap();
