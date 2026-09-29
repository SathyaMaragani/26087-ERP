import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ERPLMS Backend E2E API Verification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let klhAdminToken: string;
  let klhOrgId: string;
  let abcOrgId: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'api/docs'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Retrieve seeded organization IDs
    const [klh, abc] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: 'klh-university' } }),
      prisma.organization.findUnique({ where: { slug: 'abc-institute' } }),
    ]);

    klhOrgId = klh!.id;
    abcOrgId = abc!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Health check & Request ID
  it('GET /health returns 200 with database UP and x-request-id header', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database.status).toBe('UP');
  });

  // 2. Authentication: Login as KLH Admin
  it('POST /api/v1/auth/login authenticates KLH admin and issues JWT with active tenant', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@klh.edu',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.activeOrganization.slug).toBe('klh-university');

    klhAdminToken = res.body.data.accessToken;
  });

  // 3. Academics: List departments within KLH
  it('GET /api/v1/academics/departments returns CSE department for KLH admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/departments')
      .set('Authorization', `Bearer ${klhAdminToken}`)
      .set('x-tenant-id', klhOrgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const codes = res.body.data.map((d: any) => d.code);
    expect(codes).toContain('CSE');
  });

  // 4. Strict Tenant Isolation: KLH admin attempting to access ABC Institute data
  it('Reject forged cross-tenant request with 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/academics/departments')
      .set('Authorization', `Bearer ${klhAdminToken}`)
      .set('x-tenant-id', abcOrgId); // Forged tenant header targeting ABC Institute!

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toMatch(/FORBIDDEN/i);
    expect(res.body.error.message).toContain('Cross-tenant access forbidden');
  });

  // 5. Student Login & Personalized Analytics
  it('POST /api/v1/auth/login as student (sathya@klh.edu) and GET /api/v1/analytics/student', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'sathya@klh.edu',
        password: 'Student@123',
      });

    expect(loginRes.status).toBe(200);
    studentToken = loginRes.body.data.accessToken;

    const analyticsRes = await request(app.getHttpServer())
      .get('/api/v1/analytics/student')
      .set('Authorization', `Bearer ${studentToken}`)
      .set('x-tenant-id', klhOrgId);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.success).toBe(true);
    expect(analyticsRes.body.data.student.enrollmentNumber).toBe('2024CSE001');
    expect(analyticsRes.body.data.kpis.attendanceRate).toBeGreaterThanOrEqual(75);
    expect(analyticsRes.body.data.kpis.isAtRisk).toBe(false);
  });

  // 6. Unified Student Activity Timeline
  it('GET /api/v1/students/:id/timeline returns chronological student events', async () => {
    const student = await prisma.studentProfile.findFirst({
      where: { enrollmentNumber: '2024CSE001' },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/students/${student!.id}/timeline`)
      .set('Authorization', `Bearer ${klhAdminToken}`)
      .set('x-tenant-id', klhOrgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].type).toBeDefined();
  });
});
