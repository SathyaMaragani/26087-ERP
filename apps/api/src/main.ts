import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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
    .setTitle('ERPLMS - Institution Operating System API')
    .setDescription(
      'Multi-Tenant Institution Operating System integrating ERP, LMS, Attendance, SIS, and Real-Time Analytics.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT authentication and active tenant switching')
    .addTag('Organizations / Institutions', 'Multi-tenant institution management and branding')
    .addTag('Academic Core (SIS & Academics)', 'Programmes, batches, sections, courses, and allocations')
    .addTag('Student Information System (SIS)', 'Student profiles, enrollment, and activity timeline')
    .addTag('Faculty Directory & Allocations', 'Faculty onboarding, profiles, and teaching allocations')
    .addTag('Attendance Management', 'Session scheduling, QR/manual marking, and at-risk monitoring')
    .addTag('LMS (Learning Management System)', 'Courses, modules, structured content blocks, and assignments')
    .addTag('Analytics & Dashboards', 'Student, faculty, and executive analytics')
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
