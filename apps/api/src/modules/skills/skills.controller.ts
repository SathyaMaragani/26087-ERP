import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillCategoryDto, CreateSkillDto, AssignSkillDto } from './dto/skills.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Rural & Cooperative Skills Taxonomy')
@ApiBearerAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @ApiOperation({ summary: 'Create a new skill category' })
  @ApiResponse({ status: 201, description: 'Skill category created' })
  @RequirePermissions('skills:create')
  @Post('categories')
  async createCategory(@Body() dto: CreateSkillCategoryDto) {
    return this.skillsService.createCategory(dto);
  }

  @ApiOperation({ summary: 'List all skill categories with child skills' })
  @RequirePermissions('skills:read')
  @Get('categories')
  async getCategories() {
    return this.skillsService.getCategories();
  }

  @ApiOperation({ summary: 'Define a new skill with unique code' })
  @ApiResponse({ status: 201, description: 'Skill created' })
  @RequirePermissions('skills:create')
  @Post()
  async createSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createSkill(dto);
  }

  @ApiOperation({ summary: 'List skills (optionally filtered by category)' })
  @RequirePermissions('skills:read')
  @Get()
  async getSkills(@Query('categoryId') categoryId: string) {
    return this.skillsService.getSkills(categoryId);
  }

  @ApiOperation({ summary: 'Assign / award verified skill level to trainee' })
  @ApiResponse({ status: 201, description: 'Skill level recorded for trainee' })
  @RequirePermissions('skills:assign')
  @Post('assign')
  async assignSkill(@Body() dto: AssignSkillDto, @Req() req: AppRequest) {
    return this.skillsService.assignSkill(dto, req);
  }
}
