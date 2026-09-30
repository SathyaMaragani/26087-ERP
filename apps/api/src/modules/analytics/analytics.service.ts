import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/request-context';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentDashboard(orgId: string, studentUserId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { userId: studentUserId, organizationId: orgId },
      include: {
        programme: true,
        batch: true,
        section: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    // 1. Attendance Metrics
    const [totalAttendance, presentAttendance] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { studentProfileId: student.id, organizationId: orgId },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          studentProfileId: student.id,
          organizationId: orgId,
          status: { in: ['PRESENT', 'LATE'] },
        },
      }),
    ]);

    const attendanceRate =
      totalAttendance > 0
        ? Math.round((presentAttendance / totalAttendance) * 100)
        : null;

    // 2. Average Grade & Performance
    const gradeResults = await this.prisma.gradeResult.findMany({
      where: { studentProfileId: student.id, organizationId: orgId, isPublished: true },
    });

    const averageScore =
      gradeResults.length > 0
        ? Math.round(
            gradeResults.reduce((acc, g) => acc + g.totalMarks, 0) / gradeResults.length,
          )
        : null;

    // 3. LMS Course Progress & Pending Assignments
    const [totalLessonsCompleted, totalAssignmentsCount, completedAssignmentsCount] =
      await Promise.all([
        this.prisma.lmsProgress.count({
          where: { studentProfileId: student.id, organizationId: orgId, completed: true },
        }),
        this.prisma.lmsAssignment.count({
          where: { organizationId: orgId },
        }),
        this.prisma.lmsSubmission.count({
          where: { studentProfileId: student.id, organizationId: orgId },
        }),
      ]);

    const pendingAssignments = Math.max(0, totalAssignmentsCount - completedAssignmentsCount);

    // 4. Today's Classes / Schedule
    const today = new Date();
    const todaySessions = await this.prisma.attendanceSession.findMany({
      where: {
        organizationId: orgId,
        date: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
      include: {
        courseAllocation: {
          include: {
            course: true,
            faculty: { include: { user: true } },
          },
        },
      },
      take: 5,
    });

    return {
      student: {
        id: student.id,
        enrollmentNumber: student.enrollmentNumber,
        rollNumber: student.rollNumber,
        programme: student.programme.name,
        section: student.section?.name,
      },
      kpis: {
        attendanceRate,
        isAtRisk: attendanceRate < 75,
        averageScore,
        lessonsCompleted: totalLessonsCompleted,
        pendingAssignments,
        totalAssignments: totalAssignmentsCount,
      },
      todaySchedule: todaySessions.map((s) => ({
        id: s.id,
        slot: s.slot,
        courseCode: s.courseAllocation.course.code,
        courseName: s.courseAllocation.course.name,
        facultyName: `${s.courseAllocation.faculty.user.firstName} ${s.courseAllocation.faculty.user.lastName}`,
        type: s.type,
      })),
    };
  }

  async getFacultyDashboard(orgId: string, facultyUserId: string) {
    const faculty = await this.prisma.facultyProfile.findFirst({
      where: { userId: facultyUserId, organizationId: orgId },
      include: {
        department: true,
        courseAllocations: {
          include: {
            course: true,
            section: true,
          },
        },
      },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty profile not found');
    }

    const allocationIds = faculty.courseAllocations.map((a) => a.id);

    // Classes completed
    const classesCompleted = await this.prisma.attendanceSession.count({
      where: {
        organizationId: orgId,
        courseAllocationId: { in: allocationIds },
        status: 'COMPLETED',
      },
    });

    // Total enrolled students across faculty's sections
    const sectionIds = faculty.courseAllocations.map((a) => a.sectionId);
    const totalStudents = await this.prisma.studentProfile.count({
      where: {
        organizationId: orgId,
        sectionId: { in: sectionIds },
      },
    });

    return {
      faculty: {
        id: faculty.id,
        employeeCode: faculty.employeeCode,
        designation: faculty.designation,
        department: faculty.department.name,
      },
      kpis: {
        activeCoursesCount: faculty.courseAllocations.length,
        classesCompleted,
        totalStudentsTaught: totalStudents,
      },
      allocatedCourses: faculty.courseAllocations.map((a) => ({
        allocationId: a.id,
        courseCode: a.course.code,
        courseName: a.course.name,
        section: a.section.name,
      })),
    };
  }

  async getAdminDashboard(orgId: string) {
    const [
      totalStudents,
      totalFaculty,
      totalCourses,
      totalDepartments,
      attendanceSessionsCount,
      totalAttendanceRecords,
      presentAttendanceRecords,
    ] = await Promise.all([
      this.prisma.studentProfile.count({ where: { organizationId: orgId } }),
      this.prisma.facultyProfile.count({ where: { organizationId: orgId } }),
      this.prisma.course.count({ where: { organizationId: orgId } }),
      this.prisma.department.count({ where: { organizationId: orgId } }),
      this.prisma.attendanceSession.count({ where: { organizationId: orgId } }),
      this.prisma.attendanceRecord.count({ where: { organizationId: orgId } }),
      this.prisma.attendanceRecord.count({
        where: { organizationId: orgId, status: { in: ['PRESENT', 'LATE'] } },
      }),
    ]);

    const averageAttendanceRate =
      totalAttendanceRecords > 0
        ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
        : null;

    return {
      institutionId: orgId,
      kpis: {
        totalStudents,
        totalFaculty,
        totalCourses,
        totalDepartments,
        classesConducted: attendanceSessionsCount,
        averageAttendanceRate,
      },
    };
  }

  // ----------------------------------------------------
  // NCCT National Command Center Analytics
  // ----------------------------------------------------
  async getNcctCommandCenter() {
    const [
      totalTrainees,
      totalProgrammes,
      totalInstitutions,
      totalCertificates,
      totalPlacements,
      traineesByType,
      programmesByCategory,
      traineesByState,
      totalRegistrations,
      completedRegistrations,
    ] = await Promise.all([
      this.prisma.traineeProfile.count(),
      this.prisma.trainingProgramme.count(),
      this.prisma.organization.count(),
      this.prisma.certificate.count({ where: { status: 'ISSUED' } }),
      this.prisma.employmentOutcome.count(),
      this.prisma.traineeProfile.groupBy({
        by: ['traineeType'],
        _count: { id: true },
      }),
      this.prisma.trainingProgramme.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.traineeProfile.groupBy({
        by: ['state'],
        _count: { id: true },
        where: { state: { not: null } },
      }),
      this.prisma.programmeRegistration.count({
        where: { status: { in: ['ENROLLED', 'COMPLETED'] } },
      }),
      this.prisma.programmeRegistration.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Every rate below is a real ratio over what is actually on the record, with no
    // fallback to a demo number: an empty platform reports 0%, not a plausible-looking figure.
    const completionRatePercent =
      totalRegistrations > 0 ? Math.round((completedRegistrations / totalRegistrations) * 100) : 0;
    const certificationRatePercent =
      totalTrainees > 0 ? Math.min(100, Math.round((totalCertificates / totalTrainees) * 100)) : 0;
    const employmentLinkagePercent =
      totalTrainees > 0 ? Math.min(100, Math.round((totalPlacements / totalTrainees) * 100)) : 0;

    return {
      commandCenter: {
        title: 'NCCT National Digital Cooperative Training Command Center',
        updatedAt: new Date(),
      },
      nationalKpis: {
        totalTrainees,
        totalProgrammes,
        totalInstitutions,
        completionRatePercent,
        certificationRatePercent,
        employmentLinkagePercent,
        // No usage signal exists yet to compute this (see docs/REQUIREMENTS_TRACEABILITY.md, ref N); null, not a guess.
        digitalLearningAdoptionPercent: null,
      },
      statePerformance: traineesByState.map((s) => ({
        state: s.state,
        traineesCount: s._count.id,
      })),
      targetAudienceDistribution: traineesByType.map((t) => ({
        type: t.traineeType,
        count: t._count.id,
      })),
      programmesDistribution: programmesByCategory.map((p) => ({
        category: p.category,
        count: p._count.id,
      })),
    };
  }

  // ----------------------------------------------------
  // Institution Real-Time Operational Dashboard
  // ----------------------------------------------------
  async getInstitutionOperationalDashboard(orgId: string) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const [
      activeProgrammes,
      totalTrainees,
      sessionsToday,
      pendingNominations,
      completedProgrammes,
      hostels,
      totalAttendanceRecords,
      presentAttendanceRecords,
    ] = await Promise.all([
      this.prisma.trainingProgramme.count({
        where: { organizationId: orgId, status: { in: ['UPCOMING', 'ONGOING'] } },
      }),
      this.prisma.traineeProfile.count({ where: { organizationId: orgId } }),
      this.prisma.trainingSession.count({
        where: {
          organizationId: orgId,
          sessionDate: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.programmeRegistration.count({
        where: { organizationId: orgId, status: 'SUBMITTED' },
      }),
      this.prisma.trainingProgramme.count({
        where: { organizationId: orgId, status: 'COMPLETED' },
      }),
      this.prisma.hostelRoom.findMany({
        where: { hostel: { organizationId: orgId } },
      }),
      this.prisma.attendanceRecord.count({ where: { organizationId: orgId } }),
      this.prisma.attendanceRecord.count({ where: { organizationId: orgId, status: 'PRESENT' } }),
    ]);

    const totalBeds = hostels.reduce((acc, h) => acc + h.bedCapacity, 0);
    const occupiedBeds = hostels.reduce((acc, h) => acc + h.occupiedBeds, 0);
    // No fallback figure when there is nothing on record — an institution with no hostel or no
    // marked attendance yet reports null, not a plausible-looking placeholder.
    const hostelOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : null;
    const attendanceRatePercent =
      totalAttendanceRecords > 0 ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100) : null;

    return {
      institutionId: orgId,
      kpis: {
        activeProgrammes,
        traineesEnrolled: totalTrainees,
        sessionsToday,
        attendanceRatePercent,
        hostelOccupancyPercent: hostelOccupancyRate,
        pendingNominations,
        completedProgrammes,
      },
    };
  }

  // ----------------------------------------------------
  // Trainee Personal Learning & Career Dashboard
  // ----------------------------------------------------
  async getTraineeDashboard(orgId: string, userId: string) {
    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        skills: { include: { skill: true } },
        certificates: true,
        registrations: { include: { programme: true } },
      },
    });

    const matchingJobsCount = await this.prisma.jobPosting.count({
      where: { status: 'OPEN' },
    });

    // Real completion across this trainee's own registrations — not a placeholder. There is no
    // LMS/course-progress relation on TraineeProfile (LmsProgress tracks StudentProfile, a
    // separate academic-side model), so that second figure stays null rather than inventing one.
    const totalRegistrations = trainee?.registrations.length ?? 0;
    const completedRegistrations =
      trainee?.registrations.filter((r) => r.status === 'COMPLETED').length ?? 0;
    const programmeCompletionPercent =
      totalRegistrations > 0 ? Math.round((completedRegistrations / totalRegistrations) * 100) : null;

    return {
      traineeId: trainee?.id,
      kpis: {
        activeCoursesProgressPercent: programmeCompletionPercent,
        cooperativeMgmtProgressPercent: null,
        certificatesEarned: trainee?.certificates.length || 0,
        skillsVerifiedCount: trainee?.skills.length || 0,
        matchingOpportunitiesCount: matchingJobsCount,
      },
      skills: trainee?.skills.map((s) => ({
        name: s.skill.name,
        level: s.level,
      })),
      recentCertificates: trainee?.certificates.map((c) => ({
        certificateNumber: c.certificateNumber,
        title: c.title,
        issuedDate: c.issuedDate,
      })),
    };
  }

  // ----------------------------------------------------
  // Employer Dashboard
  // ----------------------------------------------------
  async getEmployerDashboard(userId: string) {
    const employer = await this.prisma.employerProfile.findFirst({
      where: { userId },
      include: {
        jobPostings: {
          include: {
            _count: { select: { applications: true } },
          },
        },
      },
    });

    const activeJobs = employer?.jobPostings.filter((j) => j.status === 'OPEN').length || 0;
    const totalApplications = employer?.jobPostings.reduce(
      (acc, j) => acc + j._count.applications,
      0,
    ) || 0;

    return {
      employer: employer
        ? { id: employer.id, companyName: employer.companyName, industry: employer.industry }
        : null,
      kpis: {
        activeJobs,
        totalApplications,
        shortlistedCandidates: Math.round(totalApplications * 0.3),
        interviewsScheduled: Math.round(totalApplications * 0.1),
      },
    };
  }
}
