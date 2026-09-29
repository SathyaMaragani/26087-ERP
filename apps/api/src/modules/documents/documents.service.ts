import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { AppRequest } from '../../common/types/request-context';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateDocumentDto, req: AppRequest) {
    const orgId = req.tenantId;
    const userId = req.user?.id;
    if (!orgId || !userId) {
      throw new BadRequestException('Organization context and authenticated user required');
    }

    if (dto.sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds maximum allowed threshold of 25MB`);
    }

    const doc = await this.prisma.document.create({
      data: {
        organizationId: orgId,
        ownerId: userId,
        name: dto.name,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        storageKey: dto.storageKey,
        checksum: dto.checksum,
        category: dto.category || 'GENERAL',
      },
      include: { owner: true },
    });

    await this.auditService.log({
      userId,
      organizationId: orgId,
      action: 'DOCUMENT_UPLOADED',
      resource: 'Document',
      resourceId: doc.id,
      newValues: { name: doc.name, sizeBytes: doc.sizeBytes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return {
      ...doc,
      downloadUrl: `https://storage.ncct.gov.in/${doc.storageKey}`,
    };
  }

  async findAll(category: string | undefined, req: AppRequest) {
    const orgId = req.tenantId;
    const docs = await this.prisma.document.findMany({
      where: {
        organizationId: orgId,
        ...(category && { category }),
        isArchived: false,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => ({
      ...d,
      downloadUrl: `https://storage.ncct.gov.in/${d.storageKey}`,
    }));
  }

  async findOne(id: string, req: AppRequest) {
    const orgId = req.tenantId;
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: orgId },
      include: { owner: true },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return {
      ...doc,
      downloadUrl: `https://storage.ncct.gov.in/${doc.storageKey}`,
    };
  }
}
