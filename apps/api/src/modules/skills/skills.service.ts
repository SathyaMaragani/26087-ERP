import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSkillCategoryDto, CreateSkillDto, AssignSkillDto } from './dto/skills.dto';
import { AppRequest } from '../../common/types/request-context';

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createCategory(dto: CreateSkillCategoryDto) {
    const existing = await this.prisma.skillCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Skill Category '${dto.name}' already exists`);
    }

    return this.prisma.skillCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async createSkill(dto: CreateSkillDto) {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Skill Category not found');
    }

    const existingCode = await this.prisma.skill.findUnique({
      where: { code: dto.code },
    });
    if (existingCode) {
      throw new ConflictException(`Skill code '${dto.code}' already exists`);
    }

    return this.prisma.skill.create({
      data: {
        name: dto.name,
        code: dto.code,
        categoryId: category.id,
        description: dto.description,
      },
      include: { category: true },
    });
  }

  async getCategories() {
    return this.prisma.skillCategory.findMany({
      include: { skills: true },
      orderBy: { name: 'asc' },
    });
  }

  async getSkills(categoryId?: string) {
    return this.prisma.skill.findMany({
      where: {
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async assignSkill(dto: AssignSkillDto, req: AppRequest) {
    const orgId = req.tenantId;
    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { id: dto.traineeId, organizationId: orgId },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    const traineeSkill = await this.prisma.traineeSkill.upsert({
      where: {
        traineeId_skillId: {
          traineeId: trainee.id,
          skillId: skill.id,
        },
      },
      update: {
        level: dto.level,
        verifiedAt: new Date(),
        verifiedBy: req.user?.id,
      },
      create: {
        traineeId: trainee.id,
        skillId: skill.id,
        level: dto.level,
        verifiedAt: new Date(),
        verifiedBy: req.user?.id,
      },
      include: { skill: true },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'TRAINEE_SKILL_ASSIGNED',
      resource: 'TraineeSkill',
      resourceId: traineeSkill.id,
      newValues: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return traineeSkill;
  }
}
