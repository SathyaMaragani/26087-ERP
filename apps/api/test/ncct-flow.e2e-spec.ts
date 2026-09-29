import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('NCCT Digital Ecosystem End-to-End API Verification', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ncctAdminToken: string;
  let ricmDirectorToken: string;
  let coordinatorToken: string;
  let traineeToken: string;
  let employerToken: string;

  let ricmOrgId: string;
  let abcOrgId: string;

  let testProgrammeId: string;
  let testBatchId: string;
  let testTraineeProfileId: string;
  let testTrainerProfileId: string;
  let testJobId: string;
  let issuedCertCode: string;

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

    // Fetch seeded organizations
    const [ricm, abc] = await Promise.all([
      prisma.organization.findUnique({ where: { slug: 'ricm-hyderabad' } }),
      prisma.organization.findUnique({ where: { slug: 'abc-institute' } }),
    ]);

    ricmOrgId = ricm!.id;
    abcOrgId = abc!.id;

    // Fetch trainer and trainee profiles
    const [trainer, trainee] = await Promise.all([
      prisma.trainerProfile.findFirst({ where: { organizationId: ricmOrgId } }),
      prisma.traineeProfile.findFirst({ where: { organizationId: ricmOrgId } }),
    ]);

    testTrainerProfileId = trainer!.id;
    testTraineeProfileId = trainee!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ----------------------------------------------------
  // 1. Health Diagnostics
  // ----------------------------------------------------
  it('GET /health returns 200 with database UP and x-request-id tracing', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database.status).toBe('UP');
  });

  // ----------------------------------------------------
  // 2. Auth Security Hardening & Refresh Token Rotation
  // ----------------------------------------------------
  it('POST /api/v1/auth/login issues JWT & cryptographically secure Refresh Token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'director@ricm-hyd.ac.in',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.activeOrganization.slug).toBe('ricm-hyderabad');

    ricmDirectorToken = res.body.data.accessToken;

    // Test Refresh Token Rotation
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: res.body.data.refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(res.body.data.refreshToken);

    // Update director token to the freshly rotated token
    ricmDirectorToken = refreshRes.body.data.accessToken;
  });

  it('Authenticate NCCT Platform Admin, Coordinator, Trainee, and Recruiter', async () => {
    // NCCT Admin
    const ncctRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ncct.admin@ncct.gov.in', password: 'Admin@123' });
    expect(ncctRes.status).toBe(200);
    ncctAdminToken = ncctRes.body.data.accessToken;

    // Coordinator
    const coordRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'coordinator@ricm-hyd.ac.in', password: 'Coordinator@123' });
    expect(coordRes.status).toBe(200);
    coordinatorToken = coordRes.body.data.accessToken;

    // Trainee
    const traineeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.kumar@rural.in', password: 'Trainee@123' });
    expect(traineeRes.status).toBe(200);
    traineeToken = traineeRes.body.data.accessToken;

    // Recruiter
    const empRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'recruiter@markfed.telangana.gov.in', password: 'Employer@123' });
    expect(empRes.status).toBe(200);
    employerToken = empRes.body.data.accessToken;
  });

  // ----------------------------------------------------
  // 3. NCCT National Command Center Analytics
  // ----------------------------------------------------
  it('GET /api/v1/analytics/ncct-command-center returns national KPIs and state breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/analytics/ncct-command-center')
      .set('Authorization', `Bearer ${ncctAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nationalKpis.totalTrainees).toBeGreaterThan(0);
    expect(res.body.data.nationalKpis.completionRatePercent).toBeDefined();
    expect(res.body.data.nationalKpis.certificationRatePercent).toBeDefined();
    expect(res.body.data.nationalKpis.employmentLinkagePercent).toBeDefined();
    expect(Array.isArray(res.body.data.statePerformance)).toBe(true);
  });

  // ----------------------------------------------------
  // 4. Training ERP: Programme & Batch Management
  // ----------------------------------------------------
  it('POST /api/v1/programmes creates a new training programme and batch', async () => {
    const uniqueSuffix = Date.now();
    const prgRes = await request(app.getHttpServer())
      .post('/api/v1/programmes')
      .set('Authorization', `Bearer ${ricmDirectorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        code: `PRG-AI-AGRI-${uniqueSuffix}`,
        title: 'Smart Agri-Business & AI for Cooperative Societies',
        description: 'Advanced 5-day workshop on precision agri-tools and cooperative business intelligence.',
        category: 'Agri-Business',
        targetAudience: 'FPO Leaders & Rural Youth',
        mode: 'BLENDED',
        durationDays: 5,
        startDate: '2026-11-01T09:00:00.000Z',
        endDate: '2026-11-06T17:00:00.000Z',
        capacity: 40,
        location: 'RICM Hyderabad Campus',
        hostelRequired: true,
      });

    expect(prgRes.status).toBe(201);
    expect(prgRes.body.data.id).toBeDefined();
    testProgrammeId = prgRes.body.data.id;

    // Create Batch
    const batchRes = await request(app.getHttpServer())
      .post(`/api/v1/programmes/${testProgrammeId}/batches`)
      .set('Authorization', `Bearer ${ricmDirectorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        batchCode: `BATCH-AGRI-${uniqueSuffix}`,
        name: 'Agri-Business Batch 1',
        trainerId: testTrainerProfileId,
        startDate: '2026-11-01T09:00:00.000Z',
        endDate: '2026-11-06T17:00:00.000Z',
        capacity: 30,
      });

    expect(batchRes.status).toBe(201);
    expect(batchRes.body.data.id).toBeDefined();
    testBatchId = batchRes.body.data.id;
  });

  // ----------------------------------------------------
  // 5. Online Registration & Nomination Workflow
  // ----------------------------------------------------
  it('Trainee self-registers and Coordinator approves & enrolls into batch', async () => {
    // 1. Trainee registers
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/nominations/register')
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        programmeId: testProgrammeId,
        nominationType: 'SELF',
        remarks: 'Eager to implement smart tools at our local PACS.',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.status).toBe('SUBMITTED');
    const registrationId = regRes.body.data.id;

    // 2. Coordinator approves and enrolls trainee into batch
    const approveRes = await request(app.getHttpServer())
      .patch(`/api/v1/nominations/${registrationId}/status`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        status: 'ENROLLED',
        batchId: testBatchId,
        remarks: 'Approved based on PACS affiliation.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('ENROLLED');
    expect(approveRes.body.data.batchId).toBe(testBatchId);
  });

  // ----------------------------------------------------
  // 6. Timetable Engine & Strict Conflict Detection
  // ----------------------------------------------------
  it('Schedule session and reject overlapping session with 409 Conflict', async () => {
    // Clean any prior test sessions for this trainer to ensure test idempotency
    await prisma.trainingSession.deleteMany({
      where: { trainerId: testTrainerProfileId },
    });

    // 1. Schedule first valid session
    const s1Res = await request(app.getHttpServer())
      .post('/api/v1/timetable/sessions')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        batchId: testBatchId,
        trainerId: testTrainerProfileId,
        room: 'Room 302 (Conference Hall)',
        sessionDate: '2026-11-02T00:00:00.000Z',
        startTime: '10:00',
        endTime: '12:00',
        topic: 'Precision Farming Data Analytics',
      });

    expect(s1Res.status).toBe(201);
    expect(s1Res.body.data.id).toBeDefined();

    // 2. Attempt to schedule conflicting session with overlapping trainer & room (11:00 - 13:00)
    const conflictRes = await request(app.getHttpServer())
      .post('/api/v1/timetable/sessions')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        batchId: testBatchId,
        trainerId: testTrainerProfileId,
        room: 'Room 302 (Conference Hall)',
        sessionDate: '2026-11-02T00:00:00.000Z',
        startTime: '11:00',
        endTime: '13:00',
        topic: 'Overlapping Session',
      });

    // Must be rejected with 409 Conflict!
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.success).toBe(false);
  });

  // ----------------------------------------------------
  // 7. Hostel Management & Occupancy KPI
  // ----------------------------------------------------
  it('GET /api/v1/hostels/occupancy returns occupied beds and occupancy rate', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/hostels/occupancy')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalBeds).toBeGreaterThan(0);
    expect(res.body.data.occupiedBeds).toBeGreaterThanOrEqual(1);
    expect(res.body.data.occupancyRatePercent).toBeDefined();
  });

  // ----------------------------------------------------
  // 8. Logistics Management
  // ----------------------------------------------------
  it('Create and update logistics fulfillment status', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/logistics')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        programmeId: testProgrammeId,
        category: 'EQUIPMENT',
        title: 'Tablets for Smart Agriculture Simulation',
        quantity: 20,
        vendorName: 'National Electronics Corp',
        cost: 300000,
        status: 'PENDING',
      });

    expect(createRes.status).toBe(201);
    const logId = createRes.body.data.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/logistics/${logId}/status`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        status: 'DELIVERED',
        remarks: 'Delivered and verified by IT coordinator.',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.status).toBe('DELIVERED');
  });

  // ----------------------------------------------------
  // 9. Multilingual LMS & Offline Sync
  // ----------------------------------------------------
  it('POST /api/v1/lms/sync idempotently syncs offline completed lessons', async () => {
    const syncRes = await request(app.getHttpServer())
      .post('/api/v1/lms/sync')
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        items: [
          {
            lessonId: 'simulated-offline-lesson-1',
            timeSpentSeconds: 600,
            completedAt: '2026-10-06T15:00:00.000Z',
          },
        ],
      });

    expect(syncRes.status).toBe(201);
    expect(syncRes.body.success).toBe(true);
    expect(syncRes.body.data.success).toBe(true);
  });

  // ----------------------------------------------------
  // 10. Digital Certifications & Public QR Verification
  // ----------------------------------------------------
  it('Issue digital certificate and verify publicly WITHOUT authentication token', async () => {
    // 1. Issue certificate
    const issueRes = await request(app.getHttpServer())
      .post('/api/v1/certifications/issue')
      .set('Authorization', `Bearer ${ricmDirectorToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        traineeId: testTraineeProfileId,
        programmeId: testProgrammeId,
        title: 'NCCT Certificate in Smart Agri-Business Management',
        skillsAcquired: ['Smart Agri-Business', 'PACS Accounting'],
        grade: 'Distinction (A+)',
      });

    expect(issueRes.status).toBe(201);
    expect(issueRes.body.data.certificateNumber).toMatch(/^NCCT-2026-[A-Z0-9]{6}$/);
    issuedCertCode = issueRes.body.data.certificateNumber;

    // 2. Public QR Verification WITHOUT Authorization header!
    const verifyRes = await request(app.getHttpServer())
      .get(`/api/v1/certifications/${issuedCertCode}/verify`);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.isValid).toBe(true);
    expect(verifyRes.body.data.certificate.certificateNumber).toBe(issuedCertCode);
    expect(verifyRes.body.data.certificate.recipient.name).toContain('Ramesh');
    expect(verifyRes.body.data.certificate.issuingAuthority.institution).toContain('RICM');
  });

  // ----------------------------------------------------
  // 11. Employment Exchange & Skill-Matching Engine
  // ----------------------------------------------------
  it('Post Job, run Skill-Matching Engine (%), and apply for job', async () => {
    // 1. Employer creates Job
    const employer = await prisma.employerProfile.findFirst();
    const jobRes = await request(app.getHttpServer())
      .post('/api/v1/employment/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        employerId: employer!.id,
        title: 'Cooperative Data Officer',
        description: 'Manage digital transactions and cooperative accounts.',
        requiredSkills: ['Digital Payments & UPI Integration', 'PACS Accounting'],
        location: 'Hyderabad & Warangal',
        vacancies: 5,
        salaryRange: '₹3,00,000 - ₹3,60,000 p.a.',
      });

    expect(jobRes.status).toBe(201);
    testJobId = jobRes.body.data.id;

    // 2. Run Candidate Skill-Matching Engine
    const matchRes = await request(app.getHttpServer())
      .get(`/api/v1/employment/jobs/${testJobId}/candidates`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId);

    expect(matchRes.status).toBe(200);
    expect(matchRes.body.data.topMatches).toBeDefined();
    expect(matchRes.body.data.topMatches.length).toBeGreaterThan(0);
    // Trainee Ramesh has both skills -> 100% match
    const rameshMatch = matchRes.body.data.topMatches.find(
      (m: any) => m.traineeId === testTraineeProfileId,
    );
    expect(rameshMatch).toBeDefined();
    expect(rameshMatch.matchScorePercent).toBe(100);

    // 3. Trainee applies for job
    const applyRes = await request(app.getHttpServer())
      .post(`/api/v1/employment/jobs/${testJobId}/apply`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        jobPostingId: testJobId,
        traineeId: testTraineeProfileId,
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.matchScore).toBe(100);

    // 4. Record Placement Outcome
    const outcomeRes = await request(app.getHttpServer())
      .post('/api/v1/employment/outcomes')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        traineeId: testTraineeProfileId,
        employerName: 'Telangana Markfed',
        jobTitle: 'Cooperative Data Officer',
        placementDate: '2026-11-15T00:00:00.000Z',
        annualPackage: 320000,
      });

    expect(outcomeRes.status).toBe(201);
    expect(outcomeRes.body.data.verificationStatus).toBe('VERIFIED');
  });

  // ----------------------------------------------------
  // 12. Controlled Career Counseling Assistant
  // ----------------------------------------------------
  it('POST /api/v1/career/chat provides grounded recommendations based on acquired skills', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/career/chat')
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', ricmOrgId)
      .send({
        traineeId: testTraineeProfileId,
        message: 'What jobs can I apply for with my current skills and certificate?',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.intent).toBe('JOB_SEARCH');
  });

  // ----------------------------------------------------
  // 13. Strict Tenant Isolation Protection
  // ----------------------------------------------------
  it('Strict Tenant Isolation: RICM Director cannot access ABC Institute data', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/programmes')
      .set('Authorization', `Bearer ${ricmDirectorToken}`)
      .set('x-tenant-id', abcOrgId); // Forged header targeting ABC Institute

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ----------------------------------------------------
  // 14. Dynamic Rotating QR Attendance & Anti-Fraud
  // ----------------------------------------------------
  it('Dynamic Rotating QR: Generate QR token, scan to record attendance, and reject forged tokens', async () => {
    const session = await prisma.attendanceSession.findFirst({
      where: { organizationId: ricmOrgId },
    });

    // 1. Generate dynamic rotating QR
    const qrRes = await request(app.getHttpServer())
      .post(`/api/v1/attendance/sessions/${session!.id}/qr-code`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', session!.organizationId);

    expect(qrRes.status).toBe(201);
    expect(qrRes.body.success).toBe(true);
    expect(qrRes.body.data.token).toBeDefined();
    expect(qrRes.body.data.expiresAt).toBeGreaterThan(Date.now());
    const validQrToken = qrRes.body.data.token;

    // 2. Trainee scans the dynamic QR code
    const scanRes = await request(app.getHttpServer())
      .post(`/api/v1/attendance/sessions/${session!.id}/qr-scan`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', session!.organizationId)
      .send({ qrToken: validQrToken });

    expect(scanRes.status).toBe(201);
    expect(scanRes.body.success).toBe(true);
    expect(scanRes.body.data.status).toBe('PRESENT');
    expect(scanRes.body.data.method).toBe('QR');

    // 3. Forged QR token attempt MUST fail with 400 Bad Request
    const forgedRes = await request(app.getHttpServer())
      .post(`/api/v1/attendance/sessions/${session!.id}/qr-scan`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', session!.organizationId)
      .send({ qrToken: 'invalid.forged.qr.token' });

    expect(forgedRes.status).toBe(400);
    expect(forgedRes.body.success).toBe(false);
  });

  // ----------------------------------------------------
  // 15. Decoupled Biometric / Face Recognition Attendance
  // ----------------------------------------------------
  it('Face Recognition Attendance: Enforce privacy consent before verifying attendance', async () => {
    const session = await prisma.attendanceSession.findFirst({
      where: { organizationId: ricmOrgId },
    });

    // 1. Rejection when explicit biometric consent is FALSE (Privacy protection)
    const noConsentRes = await request(app.getHttpServer())
      .post(`/api/v1/attendance/sessions/${session!.id}/face-verify`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', session!.organizationId)
      .send({
        consentGranted: false,
        faceEmbedding: 'embedding_vector_simulated',
      });

    expect(noConsentRes.status).toBe(400);
    expect(noConsentRes.body.success).toBe(false);
    expect(noConsentRes.body.error.message).toContain('consent is required');

    // 2. Successful verification when explicit biometric consent is TRUE
    const validConsentRes = await request(app.getHttpServer())
      .post(`/api/v1/attendance/sessions/${session!.id}/face-verify`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', session!.organizationId)
      .send({
        consentGranted: true,
        faceEmbedding: 'embedding_vector_simulated',
        livenessConfidence: 99.2,
      });

    expect(validConsentRes.status).toBe(201);
    expect(validConsentRes.body.success).toBe(true);
    expect(validConsentRes.body.data.method).toBe('FACE');
    expect(validConsentRes.body.data.consentRecorded).toBe(true);
  });

  // ----------------------------------------------------
  // 16. Section 31 Specific Route Verifications
  // ----------------------------------------------------
  it('Section 31 Endpoints: /jobs, /employers, /programmes/:id/registrations, and /trainees/:id/programmes', async () => {
    // 1. GET /jobs
    const jobsRes = await request(app.getHttpServer())
      .get('/api/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId);
    expect(jobsRes.status).toBe(200);
    expect(Array.isArray(jobsRes.body.data)).toBe(true);

    // 2. GET /jobs/:id/applications
    const jobAppsRes = await request(app.getHttpServer())
      .get(`/api/v1/jobs/${testJobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId);
    expect(jobAppsRes.status).toBe(200);
    expect(Array.isArray(jobAppsRes.body.data)).toBe(true);
    expect(jobAppsRes.body.data.length).toBeGreaterThan(0);

    // 3. GET /employers
    const empRes = await request(app.getHttpServer())
      .get('/api/v1/employers')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('x-tenant-id', ricmOrgId);
    expect(empRes.status).toBe(200);
    expect(Array.isArray(empRes.body.data)).toBe(true);

    // 4. GET /programmes/:id/registrations
    const progRegsRes = await request(app.getHttpServer())
      .get(`/api/v1/programmes/${testProgrammeId}/registrations`)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('x-tenant-id', ricmOrgId);
    expect(progRegsRes.status).toBe(200);
    expect(Array.isArray(progRegsRes.body.data)).toBe(true);
    expect(progRegsRes.body.data.length).toBeGreaterThan(0);

    // 5. GET /trainees/:id/programmes
    const traineeProgsRes = await request(app.getHttpServer())
      .get(`/api/v1/trainees/${testTraineeProfileId}/programmes`)
      .set('Authorization', `Bearer ${traineeToken}`)
      .set('x-tenant-id', ricmOrgId);
    expect(traineeProgsRes.status).toBe(200);
    expect(Array.isArray(traineeProgsRes.body.data)).toBe(true);
    expect(traineeProgsRes.body.data.length).toBeGreaterThan(0);
  });
});
