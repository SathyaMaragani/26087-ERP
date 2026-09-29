import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AppRequest } from '../../common/types/request-context';

@ApiTags('Document & Object Storage Management')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docService: DocumentsService) {}

  @ApiOperation({ summary: 'Register uploaded document metadata and generate download access' })
  @ApiResponse({ status: 201, description: 'Document record registered' })
  @RequirePermissions('document:upload')
  @Post()
  async create(@Body() dto: CreateDocumentDto, @Req() req: AppRequest) {
    return this.docService.create(dto, req);
  }

  @ApiOperation({ summary: 'List institution documents filterable by category' })
  @RequirePermissions('document:read')
  @Get()
  async findAll(@Query('category') category: string, @Req() req: AppRequest) {
    return this.docService.findAll(category, req);
  }

  @ApiOperation({ summary: 'Get document details and signed access URL' })
  @RequirePermissions('document:read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AppRequest) {
    return this.docService.findOne(id, req);
  }
}
