import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateEmployerDto,
  CreateJobPostingDto,
  ApplyJobDto,
  RecordOutcomeDto,
} from './dto/employment.dto';
import { AppRequest } from '../../common/types/request-context';
import { JobApplicationStatus } from '@erplms/types';

@Injectable()
export class EmploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createEmployer(dto: CreateEmployerDto, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.employerProfile.create({
      data: {
        organizationId: orgId,
        userId: req.user?.id,
        companyName: dto.companyName,
        industry: dto.industry,
        contactPerson: dto.contactPerson,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        website: dto.website,
        address: dto.address,
        state: dto.state,
        district: dto.district,
        isVerified: true,
      },
    });
  }

  async getEmployers(req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.employerProfile.findMany({
      where: {
        ...(orgId && { organizationId: orgId }),
      },
      include: {
        _count: { select: { jobPostings: true } },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async createJob(dto: CreateJobPostingDto, req: AppRequest) {
    const employer = await this.prisma.employerProfile.findUnique({
      where: { id: dto.employerId },
    });
    if (!employer) {
      throw new NotFoundException('Employer profile not found');
    }

    const job = await this.prisma.jobPosting.create({
      data: {
        employerId: employer.id,
        title: dto.title,
        description: dto.description,
        requiredSkills: dto.requiredSkills,
        location: dto.location,
        vacancies: dto.vacancies || 1,
        salaryRange: dto.salaryRange,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
      include: { employer: true },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: req.tenantId,
      action: 'JOB_POSTED',
      resource: 'JobPosting',
      resourceId: job.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return job;
  }

  async getJobs(query: { location?: string; search?: string }, req: AppRequest) {
    return this.prisma.jobPosting.findMany({
      where: {
        status: 'OPEN',
        ...(query.location && {
          location: { contains: query.location, mode: 'insensitive' },
        }),
        ...(query.search && {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { employer: { companyName: { contains: query.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        employer: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async matchCandidatesForJob(jobId: string, req: AppRequest) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: { employer: true },
    });
    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const requiredSkills = (job.requiredSkills as string[]) || [];

    // Find all trainees with their skills and certificates
    const trainees = await this.prisma.traineeProfile.findMany({
      include: {
        user: true,
        skills: {
          include: { skill: true },
        },
        certificates: true,
      },
    });

    const rankedCandidates = trainees
      .map((t) => {
        const traineeSkillNames = t.skills.map((s) => s.skill.name.toLowerCase());
        const traineeSkillCodes = t.skills.map((s) => s.skill.code.toLowerCase());

        const matched = requiredSkills.filter((reqSkill) => {
          const lower = reqSkill.toLowerCase();
          return (
            traineeSkillNames.some((sn) => sn.includes(lower) || lower.includes(sn)) ||
            traineeSkillCodes.includes(lower)
          );
        });

        const score =
          requiredSkills.length > 0
            ? Math.round((matched.length / requiredSkills.length) * 100)
            : 100;

        return {
          traineeId: t.id,
          name: `${t.user.firstName} ${t.user.lastName}`,
          traineeCode: t.traineeCode,
          cooperativeAffiliation: t.cooperativeName,
          state: t.state,
          district: t.district,
          education: t.educationLevel,
          matchScorePercent: score,
          matchedSkills: matched,
          totalSkillsCount: t.skills.length,
          certificatesEarnedCount: t.certificates.length,
          hasCertificates: t.certificates.length > 0,
        };
      })
      .sort((a, b) => b.matchScorePercent - a.matchScorePercent);

    return {
      job: {
        id: job.id,
        title: job.title,
        employer: job.employer.companyName,
        requiredSkills,
      },
      totalCandidatesEvaluated: trainees.length,
      topMatches: rankedCandidates.filter((c) => c.matchScorePercent > 0),
    };
  }

  async applyJob(dto: ApplyJobDto, req: AppRequest) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id: dto.jobPostingId },
    });
    if (!job) {
      throw new NotFoundException('Job posting not found');
    }

    const trainee = await this.prisma.traineeProfile.findUnique({
      where: { id: dto.traineeId },
      include: {
        skills: { include: { skill: true } },
      },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobPostingId_traineeId: {
          jobPostingId: job.id,
          traineeId: trainee.id,
        },
      },
    });
    if (existing) {
      throw new ConflictException('You have already applied for this job');
    }

    // Calculate match score
    const requiredSkills = (job.requiredSkills as string[]) || [];
    const traineeSkillNames = trainee.skills.map((s) => s.skill.name.toLowerCase());
    const matched = requiredSkills.filter((reqSkill) => {
      const lower = reqSkill.toLowerCase();
      return traineeSkillNames.some((sn) => sn.includes(lower) || lower.includes(sn));
    });

    const matchScore =
      requiredSkills.length > 0
        ? Math.round((matched.length / requiredSkills.length) * 100)
        : 100;

    const application = await this.prisma.jobApplication.create({
      data: {
        jobPostingId: job.id,
        traineeId: trainee.id,
        status: JobApplicationStatus.APPLIED,
        matchScore,
      },
      include: {
        jobPosting: { include: { employer: true } },
        trainee: { include: { user: true } },
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: req.tenantId,
      action: 'JOB_APPLIED',
      resource: 'JobApplication',
      resourceId: application.id,
      newValues: { matchScore, jobId: job.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return application;
  }

  async getApplications(jobId?: string, req?: AppRequest) {
    return this.prisma.jobApplication.findMany({
      where: {
        ...(jobId && { jobPostingId: jobId }),
      },
      include: {
        jobPosting: { include: { employer: true } },
        trainee: { include: { user: true, skills: { include: { skill: true } } } },
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  async recordOutcome(dto: RecordOutcomeDto, req: AppRequest) {
    const trainee = await this.prisma.traineeProfile.findUnique({
      where: { id: dto.traineeId },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const outcome = await this.prisma.employmentOutcome.create({
      data: {
        traineeId: trainee.id,
        employerName: dto.employerName,
        jobTitle: dto.jobTitle,
        placementDate: new Date(dto.placementDate),
        annualPackage: dto.annualPackage,
        verificationStatus: 'VERIFIED',
      },
      include: {
        trainee: { include: { user: true } },
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: req.tenantId,
      action: 'EMPLOYMENT_OUTCOME_RECORDED',
      resource: 'EmploymentOutcome',
      resourceId: outcome.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return outcome;
  }
}
