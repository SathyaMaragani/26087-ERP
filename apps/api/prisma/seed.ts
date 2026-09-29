import {
  PrismaClient,
  Role,
  CourseType,
  AttendanceStatus,
  AttendanceMethod,
  InstitutionType,
  TraineeType,
  ProgrammeMode,
  ProgrammeStatus,
  RegistrationStatus,
  HostelAllocationStatus,
  LogisticsStatus,
  CertificateStatus,
  JobApplicationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting NCCT Digital Ecosystem Database Seeding...');

  // Clean existing tables in correct FK dependency order
  await prisma.auditLog.deleteMany();
  await prisma.employmentOutcome.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.employerProfile.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.traineeSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.logisticsItem.deleteMany();
  await prisma.hostelAllocation.deleteMany();
  await prisma.hostelRoom.deleteMany();
  await prisma.hostel.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.programmeRegistration.deleteMany();
  await prisma.programmeBatch.deleteMany();
  await prisma.trainingProgramme.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.traineeProfile.deleteMany();
  await prisma.lessonTranslation.deleteMany();
  await prisma.gradeResult.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.lmsSubmission.deleteMany();
  await prisma.lmsAssignment.deleteMany();
  await prisma.lmsProgress.deleteMany();
  await prisma.lmsLesson.deleteMany();
  await prisma.lmsModule.deleteMany();
  await prisma.lmsCourse.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.courseAllocation.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.facultyProfile.deleteMany();
  await prisma.course.deleteMany();
  await prisma.section.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.department.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const facultyPassword = await bcrypt.hash('Faculty@123', salt);
  const studentPassword = await bcrypt.hash('Student@123', salt);
  const trainerPassword = await bcrypt.hash('Trainer@123', salt);
  const traineePassword = await bcrypt.hash('Trainee@123', salt);
  const coordinatorPassword = await bcrypt.hash('Coordinator@123', salt);
  const employerPassword = await bcrypt.hash('Employer@123', salt);

  // 1. Super Admin User
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@erplms.platform',
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      isSuperAdmin: true,
    },
  });

  // ----------------------------------------------------
  // NCCT NATIONAL HQ (Apex Body)
  // ----------------------------------------------------
  const ncctHq = await prisma.organization.create({
    data: {
      name: 'National Council for Cooperative Training (NCCT)',
      slug: 'ncct-hq',
      domain: 'ncct.gov.in',
      logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=128&q=80',
      primaryColor: '#047857',
      timezone: 'Asia/Kolkata',
      institutionType: InstitutionType.NCCT_HQ,
      state: 'New Delhi',
      district: 'New Delhi',
      code: 'NCCT-HQ',
    },
  });

  const ncctAdminUser = await prisma.user.create({
    data: {
      email: 'ncct.admin@ncct.gov.in',
      passwordHash: adminPassword,
      firstName: 'National',
      lastName: 'Director',
      isSuperAdmin: true,
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: ncctHq.id,
      userId: ncctAdminUser.id,
      role: Role.NCCT_ADMIN,
    },
  });

  // ----------------------------------------------------
  // TENANT 1: RICM Hyderabad (Regional Institute)
  // ----------------------------------------------------
  const ricmHyd = await prisma.organization.create({
    data: {
      name: 'RICM - Regional Institute of Cooperative Management, Hyderabad',
      slug: 'ricm-hyderabad',
      domain: 'ricm-hyd.ac.in',
      logoUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=128&q=80',
      primaryColor: '#1E40AF',
      timezone: 'Asia/Kolkata',
      institutionType: InstitutionType.RICM,
      state: 'Telangana',
      district: 'Hyderabad',
      code: 'RICM-HYD',
      parentOrgId: ncctHq.id,
      settings: {
        attendanceThreshold: 75,
        hostelAvailable: true,
      },
    },
  });

  // Feature Flags
  const featureKeys = [
    'programmes',
    'nominations',
    'trainees',
    'attendance',
    'lms',
    'hostel',
    'logistics',
    'skills',
    'certifications',
    'employment',
    'counselling',
    'analytics',
  ];
  for (const key of featureKeys) {
    await prisma.featureFlag.create({
      data: {
        organizationId: ricmHyd.id,
        key,
        enabled: true,
      },
    });
  }

  // Director / Institution Admin
  const directorUser = await prisma.user.create({
    data: {
      email: 'director@ricm-hyd.ac.in',
      passwordHash: adminPassword,
      firstName: 'Dr. K.',
      lastName: 'Srinivas',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: ricmHyd.id,
      userId: directorUser.id,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  // Programme Coordinator
  const coordinatorUser = await prisma.user.create({
    data: {
      email: 'coordinator@ricm-hyd.ac.in',
      passwordHash: coordinatorPassword,
      firstName: 'Ananya',
      lastName: 'Sharma',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: ricmHyd.id,
      userId: coordinatorUser.id,
      role: Role.COORDINATOR,
    },
  });

  // Trainer / Faculty
  const trainerUser = await prisma.user.create({
    data: {
      email: 'prof.sharma@ricm-hyd.ac.in',
      passwordHash: trainerPassword,
      firstName: 'Prof. Rajesh',
      lastName: 'Sharma',
      phone: '+919876500001',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: ricmHyd.id,
      userId: trainerUser.id,
      role: Role.TRAINER,
    },
  });

  const trainerProfile = await prisma.trainerProfile.create({
    data: {
      organizationId: ricmHyd.id,
      userId: trainerUser.id,
      trainerCode: 'TR-HYD-01',
      designation: 'Senior Faculty & Cooperative Systems Lead',
      specialization: 'PACS Computerization & Digital Financial Systems',
      qualifications: 'M.Com, HDCM (VAMNICOM), Ph.D.',
      experienceYears: 14,
      bio: 'Expert in National PACS computerization project and credit societies digital transformation.',
    },
  });

  const ricmDept = await prisma.department.create({
    data: {
      organizationId: ricmHyd.id,
      name: 'Cooperative Banking & Systems',
      code: 'CBS',
    },
  });

  const ricmFaculty = await prisma.facultyProfile.create({
    data: {
      organizationId: ricmHyd.id,
      userId: trainerUser.id,
      employeeCode: 'FAC-HYD-01',
      designation: 'Senior Faculty',
      specialization: 'PACS Computerization & Rural Credit',
      departmentId: ricmDept.id,
    },
  });

  const ricmAcadYear = await prisma.academicYear.create({
    data: {
      organizationId: ricmHyd.id,
      name: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });

  const ricmProg = await prisma.programme.create({
    data: {
      organizationId: ricmHyd.id,
      departmentId: ricmDept.id,
      name: 'Higher Diploma in Cooperative Management',
      code: 'HDCM',
      degree: 'HDCM',
      durationYears: 1,
    },
  });

  const ricmCourse = await prisma.course.create({
    data: {
      organizationId: ricmHyd.id,
      departmentId: ricmDept.id,
      name: 'PACS Accounting & Digital Transactions',
      code: 'DCM-101',
      credits: 4,
      type: CourseType.CORE,
    },
  });

  const ricmSem = await prisma.semester.create({
    data: {
      organizationId: ricmHyd.id,
      academicYearId: ricmAcadYear.id,
      number: 1,
      name: 'Term 1',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-11-30'),
    },
  });

  const ricmBatch = await prisma.batch.create({
    data: {
      organizationId: ricmHyd.id,
      programmeId: ricmProg.id,
      academicYearId: ricmAcadYear.id,
      name: '2026 Batch',
      cohortYear: 2026,
    },
  });

  const ricmSection = await prisma.section.create({
    data: {
      organizationId: ricmHyd.id,
      batchId: ricmBatch.id,
      name: 'Section A',
      capacity: 40,
    },
  });

  const ricmAlloc = await prisma.courseAllocation.create({
    data: {
      organizationId: ricmHyd.id,
      courseId: ricmCourse.id,
      facultyId: ricmFaculty.id,
      sectionId: ricmSection.id,
      semesterId: ricmSem.id,
      academicYearId: ricmAcadYear.id,
    },
  });

  await prisma.attendanceSession.create({
    data: {
      organizationId: ricmHyd.id,
      courseAllocationId: ricmAlloc.id,
      date: new Date(),
      slot: '10:00 - 11:00',
      type: 'WORKSHOP',
      takenByFacultyId: ricmFaculty.id,
    },
  });

  // Trainee / Rural Youth / PACS Member
  const traineeUser = await prisma.user.create({
    data: {
      email: 'ramesh.kumar@rural.in',
      passwordHash: traineePassword,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '+919876543210',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: ricmHyd.id,
      userId: traineeUser.id,
      role: Role.TRAINEE,
    },
  });

  const traineeProfile = await prisma.traineeProfile.create({
    data: {
      organizationId: ricmHyd.id,
      userId: traineeUser.id,
      traineeCode: 'TRN-2026-001',
      traineeType: TraineeType.PACS_MEMBER,
      cooperativeName: 'Gollapally Primary Agricultural Credit Society',
      pacsName: 'Gollapally PACS',
      state: 'Telangana',
      district: 'Warangal',
      village: 'Gollapally',
      gender: 'Male',
      dateOfBirth: new Date('2001-08-14'),
      educationLevel: 'B.Com (Computers)',
      occupation: 'PACS Assistant',
      annualIncome: 180000,
      phone: '+919876543210',
      aadhaarMasked: 'XXXX-XXXX-8921',
    },
  });

  // Recruiter / Employer (Markfed Telangana)
  const employerUser = await prisma.user.create({
    data: {
      email: 'recruiter@markfed.telangana.gov.in',
      passwordHash: employerPassword,
      firstName: 'Suresh',
      lastName: 'Goud',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: ricmHyd.id,
      userId: employerUser.id,
      role: Role.EMPLOYER,
    },
  });

  const employerProfile = await prisma.employerProfile.create({
    data: {
      organizationId: ricmHyd.id,
      userId: employerUser.id,
      companyName: 'Telangana State Cooperative Marketing Federation (Markfed)',
      industry: 'Agri-Business & Cooperative Trading',
      contactPerson: 'Suresh Goud, HR Director',
      contactEmail: 'careers@markfed.telangana.gov.in',
      contactPhone: '+914023456789',
      website: 'https://markfed.telangana.gov.in',
      address: 'Jambagh Road, Hyderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      isVerified: true,
    },
  });

  // ----------------------------------------------------
  // TRAINING PROGRAMME & BATCH
  // ----------------------------------------------------
  const programme = await prisma.trainingProgramme.create({
    data: {
      organizationId: ricmHyd.id,
      code: 'PRG-DL-2026-01',
      title: 'Digital Literacy & Financial Systems for PACS Members',
      description:
        'Comprehensive 5-day blended training on PACS computerization, UPI payments, ERP ledger entries, and farmer member governance.',
      category: 'Digital Literacy',
      targetAudience: 'PACS Personnel, Rural Youth, SHG Representatives',
      mode: ProgrammeMode.BLENDED,
      durationDays: 5,
      startDate: new Date('2026-10-05T09:00:00.000Z'),
      endDate: new Date('2026-10-10T17:00:00.000Z'),
      capacity: 50,
      location: 'RICM Hyderabad Campus',
      eligibilityCriteria: 'Basic numeracy and member of affiliated cooperative society',
      hostelRequired: true,
      status: ProgrammeStatus.ONGOING,
    },
  });

  const batch = await prisma.programmeBatch.create({
    data: {
      organizationId: ricmHyd.id,
      programmeId: programme.id,
      trainerId: trainerProfile.id,
      batchCode: 'BATCH-A',
      name: 'Batch A - Morning Session',
      startDate: new Date('2026-10-05T09:00:00.000Z'),
      endDate: new Date('2026-10-10T17:00:00.000Z'),
      capacity: 30,
      status: 'ONGOING',
    },
  });

  // Registration & Institutional Nomination
  await prisma.programmeRegistration.create({
    data: {
      organizationId: ricmHyd.id,
      programmeId: programme.id,
      traineeId: traineeProfile.id,
      batchId: batch.id,
      nominationType: 'INSTITUTIONAL',
      nominatingOrgName: 'Gollapally Primary Agricultural Credit Society',
      nominatingOfficer: 'President V. K. Reddy',
      status: RegistrationStatus.ENROLLED,
      approvedById: directorUser.id,
      approvedAt: new Date(),
      remarks: 'Selected for state PACS computerization deployment',
    },
  });

  // Timetable Session
  await prisma.trainingSession.create({
    data: {
      organizationId: ricmHyd.id,
      batchId: batch.id,
      trainerId: trainerProfile.id,
      room: 'Room 204 (Smart Classroom)',
      sessionDate: new Date('2026-10-06T00:00:00.000Z'),
      startTime: '09:00',
      endTime: '11:00',
      topic: 'PACS Digital Accounting & Ledger Integration',
    },
  });

  // Hostel & Room Allocation
  const hostel = await prisma.hostel.create({
    data: {
      organizationId: ricmHyd.id,
      name: 'Sardar Patel Trainee Hostel',
      building: 'Block B',
      gender: 'MALE',
      totalRooms: 40,
    },
  });

  const hostelRoom = await prisma.hostelRoom.create({
    data: {
      hostelId: hostel.id,
      roomNumber: '101',
      floor: 1,
      bedCapacity: 2,
      occupiedBeds: 1,
    },
  });

  await prisma.hostelAllocation.create({
    data: {
      organizationId: ricmHyd.id,
      roomId: hostelRoom.id,
      traineeId: traineeProfile.id,
      checkInDate: new Date('2026-10-05T14:00:00.000Z'),
      checkOutDate: new Date('2026-10-10T12:00:00.000Z'),
      actualCheckIn: new Date('2026-10-05T14:30:00.000Z'),
      status: HostelAllocationStatus.CHECKED_IN,
    },
  });

  // Logistics
  await prisma.logisticsItem.create({
    data: {
      organizationId: ricmHyd.id,
      programmeId: programme.id,
      category: 'TRAINING_KITS',
      title: 'Digital Banking Handbook & POS Training Kit',
      quantity: 50,
      vendorName: 'National Cooperative Print Press',
      cost: 25000,
      status: LogisticsStatus.DELIVERED,
      remarks: 'Delivered to RICM Stores',
    },
  });

  // ----------------------------------------------------
  // SKILLS & DIGITAL CERTIFICATE
  // ----------------------------------------------------
  const skillCategory = await prisma.skillCategory.create({
    data: {
      name: 'Digital Financial Literacy',
      description: 'Core competencies for rural banking, UPI POS, and cooperative ledger accounting',
    },
  });

  const skill1 = await prisma.skill.create({
    data: {
      name: 'Digital Payments & UPI Integration',
      code: 'SKILL-UPI-01',
      categoryId: skillCategory.id,
      description: 'Ability to configure QR codes, process UPI payments, and verify reconciliation',
    },
  });

  const skill2 = await prisma.skill.create({
    data: {
      name: 'PACS Accounting',
      code: 'SKILL-PACS-01',
      categoryId: skillCategory.id,
      description: 'Proficiency in PACS double-entry bookkeeping and computerized balance sheets',
    },
  });

  // Assign verified skills to Trainee
  await prisma.traineeSkill.create({
    data: {
      traineeId: traineeProfile.id,
      skillId: skill1.id,
      level: 2, // Intermediate
      verifiedAt: new Date(),
      verifiedBy: trainerUser.id,
    },
  });

  await prisma.traineeSkill.create({
    data: {
      traineeId: traineeProfile.id,
      skillId: skill2.id,
      level: 2, // Intermediate
      verifiedAt: new Date(),
      verifiedBy: trainerUser.id,
    },
  });

  // Verifiable Digital Certificate with QR code URL
  await prisma.certificate.create({
    data: {
      organizationId: ricmHyd.id,
      traineeId: traineeProfile.id,
      programmeId: programme.id,
      certificateNumber: 'NCCT-2026-8F32A',
      title: 'NCCT National Certificate in Digital Cooperative Management',
      status: CertificateStatus.ISSUED,
      skillsAcquired: ['Digital Payments & UPI Integration', 'PACS Accounting'],
      grade: 'Distinction (A+)',
      pdfUrl: 'https://storage.ncct.gov.in/certs/NCCT-2026-8F32A.pdf',
      qrVerificationUrl: 'https://verify.ncct.gov.in/verify/NCCT-2026-8F32A',
      metadata: { issuedBy: 'Regional Director, RICM Hyderabad' },
    },
  });

  // ----------------------------------------------------
  // EMPLOYMENT EXCHANGE (Jobs & Applications)
  // ----------------------------------------------------
  const jobPosting = await prisma.jobPosting.create({
    data: {
      employerId: employerProfile.id,
      title: 'Field Digital Assistant / PACS Coordinator',
      description:
        'Responsible for training PACS personnel on digital banking reconciliation, POS machine usage, and direct benefit transfer (DBT).',
      requiredSkills: ['Digital Payments & UPI Integration', 'PACS Accounting'],
      location: 'Warangal & Nizamabad',
      vacancies: 8,
      salaryRange: '₹2,40,000 - ₹3,00,000 p.a.',
      status: 'OPEN',
      deadline: new Date('2026-11-30T17:00:00.000Z'),
    },
  });

  // Job Application with 100% skill match
  await prisma.jobApplication.create({
    data: {
      jobPostingId: jobPosting.id,
      traineeId: traineeProfile.id,
      status: JobApplicationStatus.SELECTED,
      matchScore: 100,
      remarks: 'Certified by RICM Hyderabad with Distinction. Selected for field placement.',
    },
  });

  // Verified Placement Outcome
  await prisma.employmentOutcome.create({
    data: {
      traineeId: traineeProfile.id,
      employerName: 'Telangana State Cooperative Marketing Federation',
      jobTitle: 'Field Digital Assistant',
      placementDate: new Date('2026-10-15'),
      annualPackage: 280000,
      verificationStatus: 'VERIFIED',
    },
  });

  // ----------------------------------------------------
  // BACKWARD COMPATIBILITY: KLH University (Academic ERP demo)
  // ----------------------------------------------------
  const klhOrg = await prisma.organization.create({
    data: {
      name: 'KLH University',
      slug: 'klh-university',
      domain: 'klh.edu',
      logoUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=128&q=80',
      primaryColor: '#2563EB',
      timezone: 'Asia/Kolkata',
      academicYear: '2026-2027',
      settings: { attendanceThreshold: 75, gradingSystem: 'GPA_10' },
    },
  });

  const klhAdminUser = await prisma.user.create({
    data: {
      email: 'admin@klh.edu',
      passwordHash: adminPassword,
      firstName: 'Vikram',
      lastName: 'Reddy',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: klhAdminUser.id,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  const cseDept = await prisma.department.create({
    data: {
      organizationId: klhOrg.id,
      name: 'Computer Science and Engineering',
      code: 'CSE',
    },
  });

  const acadYear = await prisma.academicYear.create({
    data: {
      organizationId: klhOrg.id,
      name: '2026-2027',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-05-31'),
      isCurrent: true,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      organizationId: klhOrg.id,
      academicYearId: acadYear.id,
      name: 'Fall Semester 2026',
      number: 1,
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-12-10'),
      isActive: true,
    },
  });

  const btechProg = await prisma.programme.create({
    data: {
      organizationId: klhOrg.id,
      departmentId: cseDept.id,
      name: 'B.Tech Computer Science and Engineering',
      code: 'BTECH-CSE',
      degree: 'B.Tech',
      durationYears: 4,
    },
  });

  const batch2026 = await prisma.batch.create({
    data: {
      organizationId: klhOrg.id,
      programmeId: btechProg.id,
      academicYearId: acadYear.id,
      name: 'Batch 2026-2030',
      cohortYear: 2026,
    },
  });

  const sectionA = await prisma.section.create({
    data: {
      organizationId: klhOrg.id,
      batchId: batch2026.id,
      name: 'Section A',
      capacity: 60,
    },
  });

  const dsaCourse = await prisma.course.create({
    data: {
      organizationId: klhOrg.id,
      departmentId: cseDept.id,
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      credits: 4,
      type: CourseType.CORE,
    },
  });

  const facultyUser = await prisma.user.create({
    data: {
      email: 'prof.smith@klh.edu',
      passwordHash: facultyPassword,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+919876543211',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: facultyUser.id,
      role: Role.FACULTY,
    },
  });

  const facultyProfile = await prisma.facultyProfile.create({
    data: {
      organizationId: klhOrg.id,
      userId: facultyUser.id,
      departmentId: cseDept.id,
      employeeCode: 'FAC-CSE-001',
      designation: 'Associate Professor',
      specialization: 'Algorithms & Distributed Systems',
    },
  });

  const allocation = await prisma.courseAllocation.create({
    data: {
      organizationId: klhOrg.id,
      courseId: dsaCourse.id,
      facultyId: facultyProfile.id,
      sectionId: sectionA.id,
      semesterId: semester.id,
      academicYearId: acadYear.id,
    },
  });

  const studentUser1 = await prisma.user.create({
    data: {
      email: 'sathya@klh.edu',
      passwordHash: studentPassword,
      firstName: 'Sathya',
      lastName: 'Narayana',
      phone: '+919876543212',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: studentUser1.id,
      role: Role.STUDENT,
    },
  });

  const studentProfile1 = await prisma.studentProfile.create({
    data: {
      organizationId: klhOrg.id,
      userId: studentUser1.id,
      programmeId: btechProg.id,
      batchId: batch2026.id,
      sectionId: sectionA.id,
      enrollmentNumber: '2024CSE001',
      rollNumber: '26CSE001',
    },
  });

  // LMS Course & Multilingual Lesson
  const lmsCourse = await prisma.lmsCourse.create({
    data: {
      organizationId: klhOrg.id,
      courseId: dsaCourse.id,
      title: 'Data Structures & Algorithms Mastery',
      description: 'Fundamental linear and non-linear data structures with practical implementation.',
      isPublished: true,
      createdById: facultyUser.id,
    },
  });

  const lmsModule = await prisma.lmsModule.create({
    data: {
      organizationId: klhOrg.id,
      lmsCourseId: lmsCourse.id,
      title: 'Module 1: Foundations of Algorithms',
      orderIndex: 1,
      isPublished: true,
    },
  });

  const lmsLesson = await prisma.lmsLesson.create({
    data: {
      organizationId: klhOrg.id,
      moduleId: lmsModule.id,
      title: 'Asymptotic Analysis & Big O Notation',
      orderIndex: 1,
      contentType: 'BLOCKS',
      contentBlocks: [
        { type: 'text', content: 'Asymptotic notation describes runtime complexity.' },
        { type: 'code', language: 'typescript', code: 'function binarySearch(arr: number[]): number {}' },
      ],
      isPublished: true,
    },
  });

  // Hindi & Telugu Translations for Lesson
  await prisma.lessonTranslation.create({
    data: {
      lessonId: lmsLesson.id,
      language: 'hi',
      title: 'असिम्प्टोटिक विश्लेषण और बिग ओ नोटेशन',
      contentBlocks: [
        { type: 'text', content: 'असिम्प्टोटिक नोटेशन एल्गोरिदम की समय जटिलता का वर्णन करता है।' },
      ],
    },
  });

  await prisma.lessonTranslation.create({
    data: {
      lessonId: lmsLesson.id,
      language: 'te',
      title: 'అసింప్టోటిక్ విశ్లేషణ మరియు బిగ్ ఓ సంకేతాలు',
      contentBlocks: [
        { type: 'text', content: 'అసింప్టోటిక్ సంజ్ఞామానం అల్గోరిథంల సమయ సంక్లిష్టతను వివరిస్తుంది.' },
      ],
    },
  });

  // Sathya's progress and attendance
  await prisma.lmsProgress.create({
    data: {
      organizationId: klhOrg.id,
      studentProfileId: studentProfile1.id,
      lessonId: lmsLesson.id,
      completed: true,
      timeSpentSeconds: 1200,
      completedAt: new Date(),
    },
  });

  const sampleSession = await prisma.attendanceSession.create({
    data: {
      organizationId: klhOrg.id,
      courseAllocationId: allocation.id,
      date: new Date(),
      slot: '09:00 - 10:00',
      type: 'LECTURE',
      takenByFacultyId: facultyProfile.id,
    },
  });

  await prisma.attendanceRecord.create({
    data: {
      organizationId: klhOrg.id,
      sessionId: sampleSession.id,
      studentProfileId: studentProfile1.id,
      status: AttendanceStatus.PRESENT,
      verifiedByMethod: AttendanceMethod.MANUAL,
    },
  });

  // Isolated Tenant for Cross-Tenant security tests
  const abcOrg = await prisma.organization.create({
    data: {
      name: 'ABC Training Institute',
      slug: 'abc-institute',
      domain: 'abc.edu',
      logoUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=128&q=80',
      primaryColor: '#DC2626',
      timezone: 'Asia/Kolkata',
      academicYear: '2026-2027',
      settings: { attendanceThreshold: 80 },
    },
  });

  const abcAdminUser = await prisma.user.create({
    data: {
      email: 'admin@abc.edu',
      passwordHash: adminPassword,
      firstName: 'Priya',
      lastName: 'Nair',
    },
  });
  await prisma.membership.create({
    data: {
      organizationId: abcOrg.id,
      userId: abcAdminUser.id,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  console.log('✅ NCCT Ecosystem & ERPLMS Database seeded successfully!');
  console.log('-------------------------------------------------------');
  console.log('NCCT Platform Admin: ncct.admin@ncct.gov.in / Admin@123');
  console.log('RICM Director:       director@ricm-hyd.ac.in / Admin@123');
  console.log('RICM Coordinator:    coordinator@ricm-hyd.ac.in / Coordinator@123');
  console.log('RICM Trainer:        prof.sharma@ricm-hyd.ac.in / Trainer@123');
  console.log('Rural Trainee:       ramesh.kumar@rural.in / Trainee@123');
  console.log('Recruiter (Markfed): recruiter@markfed.telangana.gov.in / Employer@123');
  console.log('Academic Admin:      admin@klh.edu / Admin@123');
  console.log('-------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
