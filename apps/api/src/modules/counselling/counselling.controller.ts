import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CounsellingService } from './counselling.service';
import { CareerChatDto } from './dto/counselling.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Career Counseling & AI Recommendations')
@ApiBearerAuth()
@Controller('career')
export class CounsellingController {
  constructor(private readonly counsellingService: CounsellingService) {}

  @ApiOperation({
    summary: 'Get personalized career opportunities and skill gap recommendations for a trainee',
  })
  @RequirePermissions('career:chat')
  @Get('recommendations')
  async getRecommendations(
    @Query('traineeId') traineeId: string,
    @Req() req: AppRequest,
  ) {
    return this.counsellingService.getRecommendations(traineeId, req);
  }

  @ApiOperation({
    summary: 'Controlled Career Assistant chatbot for rural youth and trainees',
  })
  @ApiResponse({ status: 200, description: 'Grounded career advice and actionable next steps' })
  @RequirePermissions('career:chat')
  @Post('chat')
  async chat(@Body() dto: CareerChatDto, @Req() req: AppRequest) {
    return this.counsellingService.chat(dto, req);
  }
}
