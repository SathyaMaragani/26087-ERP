import { PrismaClient, Role, CourseType, AttendanceStatus, AttendanceMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ERPLMS Database Seeding...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
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
  await prisma.featureFlag.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const facultyPassword = await bcrypt.hash('Faculty@123', salt);
  const studentPassword = await bcrypt.hash('Student@123', salt);

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
  // TENANT 1: KLH University
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
      settings: {
        attendanceThreshold: 75,
        gradingSystem: 'GPA_10',
      },
    },
  });

  // Feature Flags
  const featureKeys = ['attendance', 'lms', 'academics', 'assessments', 'analytics', 'documents'];
  for (const key of featureKeys) {
    await prisma.featureFlag.create({
      data: {
        organizationId: klhOrg.id,
        key,
        enabled: true,
      },
    });
  }

  // KLH Admin
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

  // Department
  const cseDept = await prisma.department.create({
    data: {
      organizationId: klhOrg.id,
      name: 'Computer Science and Engineering',
      code: 'CSE',
      description: 'Department of Computer Science & Engineering',
    },
  });

  // Academic Year & Semester
  const academicYear = await prisma.academicYear.create({
    data: {
      organizationId: klhOrg.id,
      name: '2026-2027',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  const semester = await prisma.semester.create({
    data: {
      organizationId: klhOrg.id,
      academicYearId: academicYear.id,
      name: 'Semester 3 (Fall 2026)',
      number: 3,
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-12-15'),
      isActive: true,
    },
  });

  // Programme, Batch & Section
  const programme = await prisma.programme.create({
    data: {
      organizationId: klhOrg.id,
      departmentId: cseDept.id,
      name: 'B.Tech in Computer Science and Engineering',
      code: 'CSE-BTECH',
      degree: 'B.Tech',
      durationYears: 4,
      totalSemesters: 8,
    },
  });

  const batch = await prisma.batch.create({
    data: {
      organizationId: klhOrg.id,
      programmeId: programme.id,
      academicYearId: academicYear.id,
      name: '2024-2028 Cohort',
      cohortYear: 2024,
    },
  });

  const sectionA = await prisma.section.create({
    data: {
      organizationId: klhOrg.id,
      batchId: batch.id,
      semesterId: semester.id,
      name: 'Section A',
      capacity: 60,
    },
  });

  // Course: Data Structures & Algorithms
  const dsaCourse = await prisma.course.create({
    data: {
      organizationId: klhOrg.id,
      departmentId: cseDept.id,
      code: 'CS201',
      name: 'Data Structures & Algorithms',
      credits: 4,
      type: CourseType.CORE,
      description: 'Advanced data structures, graphs, dynamic programming, and complexity analysis.',
    },
  });

  // Faculty Member: Dr. John Smith
  const facultyUser = await prisma.user.create({
    data: {
      email: 'prof.smith@klh.edu',
      passwordHash: facultyPassword,
      firstName: 'John',
      lastName: 'Smith',
      phone: '+919876543210',
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: facultyUser.id,
      role: Role.FACULTY,
      departmentId: cseDept.id,
    },
  });

  const facultyProfile = await prisma.facultyProfile.create({
    data: {
      organizationId: klhOrg.id,
      userId: facultyUser.id,
      employeeCode: 'EMP1001',
      designation: 'Associate Professor',
      qualification: 'Ph.D in Distributed Systems',
      specialization: 'Algorithms and Distributed Computing',
      departmentId: cseDept.id,
    },
  });

  // Course Allocation
  const allocation = await prisma.courseAllocation.create({
    data: {
      organizationId: klhOrg.id,
      courseId: dsaCourse.id,
      facultyId: facultyProfile.id,
      sectionId: sectionA.id,
      semesterId: semester.id,
      academicYearId: academicYear.id,
      status: 'ACTIVE',
    },
  });

  // Student 1: Sathya Narayanan
  const sathyaUser = await prisma.user.create({
    data: {
      email: 'sathya@klh.edu',
      passwordHash: studentPassword,
      firstName: 'Sathya',
      lastName: 'Narayanan',
      phone: '+919988776655',
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: sathyaUser.id,
      role: Role.STUDENT,
    },
  });

  const sathyaProfile = await prisma.studentProfile.create({
    data: {
      organizationId: klhOrg.id,
      userId: sathyaUser.id,
      enrollmentNumber: '2024CSE001',
      rollNumber: 'CS01',
      programmeId: programme.id,
      batchId: batch.id,
      sectionId: sectionA.id,
      gender: 'Male',
      address: 'Hyderabad, India',
      guardianName: 'R. Narayanan',
      guardianPhone: '+919876500000',
    },
  });

  // Student 2: Aarav Patel
  const aaravUser = await prisma.user.create({
    data: {
      email: 'aarav@klh.edu',
      passwordHash: studentPassword,
      firstName: 'Aarav',
      lastName: 'Patel',
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: klhOrg.id,
      userId: aaravUser.id,
      role: Role.STUDENT,
    },
  });

  const aaravProfile = await prisma.studentProfile.create({
    data: {
      organizationId: klhOrg.id,
      userId: aaravUser.id,
      enrollmentNumber: '2024CSE002',
      rollNumber: 'CS02',
      programmeId: programme.id,
      batchId: batch.id,
      sectionId: sectionA.id,
      gender: 'Male',
      address: 'Hyderabad, India',
    },
  });

  // Attendance Sessions & Records
  const session1 = await prisma.attendanceSession.create({
    data: {
      organizationId: klhOrg.id,
      courseAllocationId: allocation.id,
      date: new Date('2026-09-29'),
      slot: '09:00 - 10:00',
      type: 'LECTURE',
      takenByFacultyId: facultyProfile.id,
      status: 'COMPLETED',
    },
  });

  await prisma.attendanceRecord.createMany({
    data: [
      {
        organizationId: klhOrg.id,
        sessionId: session1.id,
        studentProfileId: sathyaProfile.id,
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.MANUAL,
      },
      {
        organizationId: klhOrg.id,
        sessionId: session1.id,
        studentProfileId: aaravProfile.id,
        status: AttendanceStatus.PRESENT,
        verifiedByMethod: AttendanceMethod.MANUAL,
      },
    ],
  });

  // LMS Course & Content
  const lmsDsa = await prisma.lmsCourse.create({
    data: {
      organizationId: klhOrg.id,
      courseId: dsaCourse.id,
      title: 'Data Structures & Algorithms (CSE201)',
      description: 'Interactive lecture modules, coding assignments, and quizzes.',
      isPublished: true,
      createdById: facultyUser.id,
    },
  });

  const lmsModule1 = await prisma.lmsModule.create({
    data: {
      organizationId: klhOrg.id,
      lmsCourseId: lmsDsa.id,
      title: 'Module 1: Trees and Balanced Hierarchies',
      description: 'Binary trees, AVL trees, Red-Black trees',
      orderIndex: 1,
      isPublished: true,
    },
  });

  const lmsLesson1 = await prisma.lmsLesson.create({
    data: {
      organizationId: klhOrg.id,
      moduleId: lmsModule1.id,
      title: 'Lesson 1.1: Binary Search Tree Insertion and Traversal',
      orderIndex: 1,
      contentType: 'BLOCKS',
      contentBlocks: [
        {
          id: 'b-1',
          type: 'TEXT',
          content: '## Binary Search Trees\nA Binary Search Tree is an ordered binary tree where left < node < right.',
        },
        {
          id: 'b-2',
          type: 'CODE',
          language: 'typescript',
          content: 'export function insert(node: Node | null, val: number): Node {\n  if (!node) return new Node(val);\n  if (val < node.val) node.left = insert(node.left, val);\n  else node.right = insert(node.right, val);\n  return node;\n}',
        },
      ],
      isPublished: true,
    },
  });

  // Student progress
  await prisma.lmsProgress.create({
    data: {
      organizationId: klhOrg.id,
      studentProfileId: sathyaProfile.id,
      lessonId: lmsLesson1.id,
      completed: true,
      timeSpentSeconds: 1420,
      completedAt: new Date(),
    },
  });

  // Assignment & Submission
  const assignment1 = await prisma.lmsAssignment.create({
    data: {
      organizationId: klhOrg.id,
      lmsCourseId: lmsDsa.id,
      lessonId: lmsLesson1.id,
      title: 'Assignment #1: AVL Balanced Tree Implementation',
      description: 'Implement a self-balancing AVL Tree in TypeScript with left and right rotations.',
      dueDate: new Date('2026-10-10T23:59:59Z'),
      maxMarks: 100,
    },
  });

  await prisma.lmsSubmission.create({
    data: {
      organizationId: klhOrg.id,
      assignmentId: assignment1.id,
      studentProfileId: sathyaProfile.id,
      content: 'Implemented with recursive self-balancing and height calculation.',
      fileUrl: 'https://github.com/sathya/avl-tree-submission',
      marksObtained: 94,
      feedback: 'Outstanding implementation! Handled edge cases seamlessly.',
      gradedById: facultyUser.id,
      gradedAt: new Date(),
    },
  });

  // Published Grade Result
  await prisma.gradeResult.create({
    data: {
      organizationId: klhOrg.id,
      studentProfileId: sathyaProfile.id,
      courseId: dsaCourse.id,
      semesterId: semester.id,
      internalMarks: 38,
      externalMarks: 56,
      totalMarks: 94,
      gradeLetter: 'A+',
      gradePoints: 10,
      isPublished: true,
    },
  });

  // ----------------------------------------------------
  // TENANT 2: ABC Training Institute (Isolated Tenant)
  // ----------------------------------------------------
  const abcOrg = await prisma.organization.create({
    data: {
      name: 'ABC Training Institute',
      slug: 'abc-institute',
      domain: 'abc.edu',
      primaryColor: '#059669',
      timezone: 'Asia/Kolkata',
      academicYear: '2026',
    },
  });

  const abcAdmin = await prisma.user.create({
    data: {
      email: 'admin@abc.edu',
      passwordHash: adminPassword,
      firstName: 'Ananya',
      lastName: 'Sen',
    },
  });

  await prisma.membership.create({
    data: {
      organizationId: abcOrg.id,
      userId: abcAdmin.id,
      role: Role.INSTITUTION_ADMIN,
    },
  });

  for (const key of featureKeys) {
    await prisma.featureFlag.create({
      data: {
        organizationId: abcOrg.id,
        key,
        enabled: true,
      },
    });
  }

  console.log('✅ ERPLMS Database Seeding Completed Successfully!');
  console.log('-------------------------------------------------------');
  console.log('Test Accounts created:');
  console.log('1. SuperAdmin:  superadmin@erplms.platform / Admin@123');
  console.log('2. KLH Admin:   admin@klh.edu / Admin@123');
  console.log('3. Faculty:     prof.smith@klh.edu / Faculty@123');
  console.log('4. Student:     sathya@klh.edu / Student@123');
  console.log('5. Student:     aarav@klh.edu / Student@123');
  console.log('6. ABC Admin:   admin@abc.edu / Admin@123 (Tenant Isolation Demo)');
  console.log('-------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
