import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CertificationsService } from './certifications.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Digital Certifications & QR Verification')
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certService: CertificationsService) {}

  @ApiOperation({
    summary: 'Public QR verification endpoint to verify certificate authenticity across India',
  })
  @ApiResponse({ status: 200, description: 'Certificate verification result returned' })
  @Public()
  @Get(':code/verify')
  async verify(@Param('code') code: string) {
    return this.certService.verify(code);
  }

  @ApiOperation({ summary: 'Issue an authentic NCCT digital certificate to a trainee' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Certificate issued with unique verification identifier' })
  @RequirePermissions('certificate:issue')
  @Post('issue')
  async issueCertificate(
    @Body() dto: IssueCertificateDto,
    @Req() req: AppRequest,
  ) {
    return this.certService.issueCertificate(dto, req);
  }

  @ApiOperation({ summary: 'List all certificates issued by the institution' })
  @ApiBearerAuth()
  @RequirePermissions('certificate:read')
  @Get()
  async findAll(@Req() req: AppRequest) {
    return this.certService.findAll(req);
  }

  @ApiOperation({ summary: 'Get certificate repository for a trainee' })
  @ApiBearerAuth()
  @RequirePermissions('certificate:read')
  @Get('trainee/:traineeId')
  async findByTrainee(
    @Param('traineeId') traineeId: string,
    @Req() req: AppRequest,
  ) {
    return this.certService.findByTrainee(traineeId, req);
  }
}
