import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CareerChatDto } from './dto/counselling.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class CounsellingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTrainee(traineeId?: string, req?: AppRequest) {
    if (traineeId) {
      return this.prisma.traineeProfile.findUnique({
        where: { id: traineeId },
        include: {
          user: true,
          skills: { include: { skill: true } },
          certificates: true,
        },
      });
    }

    if (req?.user?.id) {
      return this.prisma.traineeProfile.findFirst({
        where: { userId: req.user.id },
        include: {
          user: true,
          skills: { include: { skill: true } },
          certificates: true,
        },
      });
    }

    return null;
  }

  async getRecommendations(traineeId?: string, req?: AppRequest) {
    const trainee = await this.resolveTrainee(traineeId, req);
    if (!trainee) {
      throw new NotFoundException('Trainee profile not found');
    }

    const traineeSkillNames = trainee.skills.map((s) => s.skill.name.toLowerCase());

    // 1. Matching Jobs
    const openJobs = await this.prisma.jobPosting.findMany({
      where: { status: 'OPEN' },
      include: { employer: true },
    });

    const matchingJobs = openJobs.map((job) => {
      const required = (job.requiredSkills as string[]) || [];
      const matched = required.filter((r) =>
        traineeSkillNames.some((ts) => ts.includes(r.toLowerCase()) || r.toLowerCase().includes(ts)),
      );
      const score = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 100;
      return {
        jobId: job.id,
        title: job.title,
        employer: job.employer.companyName,
        location: job.location,
        salaryRange: job.salaryRange,
        matchScorePercent: score,
        matchedSkills: matched,
        missingSkills: required.filter((r) => !matched.includes(r)),
      };
    }).sort((a, b) => b.matchScorePercent - a.matchScorePercent);

    // 2. Identify common missing skills across top jobs
    const missingSkillsMap = new Map<string, number>();
    matchingJobs.slice(0, 5).forEach((j) => {
      j.missingSkills.forEach((s) => {
        missingSkillsMap.set(s, (missingSkillsMap.get(s) || 0) + 1);
      });
    });

    const recommendedSkillsToLearn = Array.from(missingSkillsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill);

    // 3. Recommended upcoming training programmes that bridge this gap
    const upcomingProgrammes = await this.prisma.trainingProgramme.findMany({
      where: { status: 'UPCOMING' },
      take: 4,
      orderBy: { startDate: 'asc' },
    });

    return {
      trainee: {
        id: trainee.id,
        name: `${trainee.user.firstName} ${trainee.user.lastName}`,
        currentSkillsCount: trainee.skills.length,
        certificatesCount: trainee.certificates.length,
      },
      topJobMatches: matchingJobs.filter((j) => j.matchScorePercent >= 50).slice(0, 5),
      recommendedSkillsToLearn,
      recommendedProgrammes: upcomingProgrammes.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        category: p.category,
        mode: p.mode,
        durationDays: p.durationDays,
        startDate: p.startDate,
        location: p.location,
      })),
    };
  }

  async chat(dto: CareerChatDto, req: AppRequest) {
    const trainee = await this.resolveTrainee(dto.traineeId, req);
    const text = dto.message.toLowerCase();

    const traineeName = trainee ? `${trainee.user.firstName}` : 'Candidate';
    const skillsList = trainee ? trainee.skills.map((s) => s.skill.name).join(', ') : '';
    const certCount = trainee ? trainee.certificates.length : 0;

    // Intent routing
    if (text.includes('job') || text.includes('apply') || text.includes('work') || text.includes('opportunity')) {
      const rec = trainee ? await this.getRecommendations(trainee.id, req) : null;
      const topJobs = rec?.topJobMatches || [];

      if (topJobs.length > 0) {
        const jobsSummary = topJobs
          .slice(0, 3)
          .map((j) => `• ${j.title} at ${j.employer} (${j.matchScorePercent}% match - Location: ${j.location})`)
          .join('\n');

        return {
          reply: `Hello ${traineeName}! Based on your acquired skills (${skillsList || 'in progress'}), here are your highest-matching career opportunities:\n\n${jobsSummary}\n\nYou can apply directly through the Employment Exchange portal.`,
          actionableLinks: topJobs.slice(0, 3).map((j) => `/employment/jobs/${j.jobId}`),
          intent: 'JOB_SEARCH',
        };
      } else {
        return {
          reply: `Hello ${traineeName}, we found upcoming vacancies in the Cooperative sector. To qualify for higher-paying roles, completing the Digital Payments or PACS Accounting module is recommended.`,
          actionableLinks: ['/programmes'],
          intent: 'JOB_SEARCH',
        };
      }
    }

    if (text.includes('skill') || text.includes('learn') || text.includes('next') || text.includes('course')) {
      const rec = trainee ? await this.getRecommendations(trainee.id, req) : null;
      const recommended = rec?.recommendedSkillsToLearn ?? [];

      return {
        reply: recommended.length > 0
          ? `Great question, ${traineeName}! Based on skills gaps in open roles you're closest to matching, the top skills to learn next are:\n\n• ${recommended.slice(0, 3).join('\n• ')}\n\nNCCT and affiliated ICMs offer certified blended training programmes covering these exact competencies.`
          : `${traineeName}, there isn't enough data yet to recommend specific skill gaps — this compares your verified skills against open job postings, and none show a clear gap right now. Check back as new postings and skills are added.`,
        actionableLinks: ['/programmes'],
        intent: 'SKILL_RECOMMENDATION',
      };
    }

    if (text.includes('certificate') || text.includes('cert')) {
      return {
        reply: `You currently have ${certCount} verified NCCT certificate(s). Each one can be checked instantly on the National Verification Portal — a registry lookup and status check, not a cryptographic signature verification.`,
        actionableLinks: ['/certifications'],
        intent: 'CERTIFICATE_INQUIRY',
      };
    }

    // Default guidance
    return {
      reply: `Hello ${traineeName}, I am your NCCT Career & Skill Counseling Assistant. I can help you with:\n1. Finding matching jobs in cooperatives & rural enterprises based on your skills.\n2. Recommending high-demand skills to learn next.\n3. Accessing your verifiable NCCT digital certifications.\n\nWhat would you like assistance with today?`,
      actionableLinks: ['/employment/jobs', '/programmes', '/certifications'],
      intent: 'GENERAL_ASSISTANCE',
    };
  }
}
