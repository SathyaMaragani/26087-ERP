import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';
import { AppRequest } from '../../common/types/request-context';
import { CertificateStatus } from '@erplms/types';
import * as crypto from 'crypto';

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async issueCertificate(dto: IssueCertificateDto, req: AppRequest) {
    const orgId = req.tenantId;
    if (!orgId) {
      throw new BadRequestException('Organization context required');
    }

    const trainee = await this.prisma.traineeProfile.findFirst({
      where: { id: dto.traineeId, organizationId: orgId },
      include: { user: true },
    });
    if (!trainee) {
      throw new NotFoundException('Trainee not found');
    }

    if (dto.programmeId) {
      const programme = await this.prisma.trainingProgramme.findFirst({
        where: { id: dto.programmeId, organizationId: orgId },
      });
      if (!programme) {
        throw new NotFoundException('Programme not found');
      }
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const certNumber = `NCCT-2026-${randomSuffix}`;
    const verificationUrl = `https://verify.ncct.gov.in/verify/${certNumber}`;

    const cert = await this.prisma.certificate.create({
      data: {
        organizationId: orgId,
        traineeId: trainee.id,
        programmeId: dto.programmeId,
        certificateNumber: certNumber,
        title: dto.title,
        status: CertificateStatus.ISSUED,
        skillsAcquired: dto.skillsAcquired || [],
        grade: dto.grade,
        pdfUrl: dto.pdfUrl,
        qrVerificationUrl: verificationUrl,
        metadata: dto.metadata || {},
      },
      include: {
        trainee: { include: { user: true } },
        organization: true,
        programme: true,
      },
    });

    await this.auditService.log({
      userId: req.user?.id,
      organizationId: orgId,
      action: 'DIGITAL_CERTIFICATE_ISSUED',
      resource: 'Certificate',
      resourceId: cert.id,
      newValues: { certificateNumber: certNumber, traineeId: trainee.id },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      requestId: req.requestId,
    });

    return cert;
  }

  async verify(certificateNumber: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificateNumber: certificateNumber.trim().toUpperCase() },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            institutionType: true,
            state: true,
            district: true,
          },
        },
        trainee: {
          select: {
            traineeCode: true,
            traineeType: true,
            cooperativeName: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        programme: {
          select: {
            code: true,
            title: true,
            category: true,
          },
        },
      },
    });

    if (!cert) {
      return {
        isValid: false,
        message: 'No certificate found with the provided identifier.',
      };
    }

    if (cert.status !== CertificateStatus.ISSUED) {
      return {
        isValid: false,
        message: 'This certificate has been revoked or invalidated by the issuing authority.',
        status: cert.status,
      };
    }

    return {
      isValid: true,
      message: 'Authentic digital certificate verified via NCCT National Registry.',
      certificate: {
        certificateNumber: cert.certificateNumber,
        title: cert.title,
        recipient: {
          name: `${cert.trainee.user.firstName} ${cert.trainee.user.lastName}`,
          traineeCode: cert.trainee.traineeCode,
          cooperativeAffiliation: cert.trainee.cooperativeName,
        },
        issuingAuthority: {
          institution: cert.organization.name,
          type: cert.organization.institutionType,
          state: cert.organization.state,
        },
        programme: cert.programme
          ? {
              code: cert.programme.code,
              title: cert.programme.title,
              category: cert.programme.category,
            }
          : null,
        skillsAcquired: cert.skillsAcquired,
        grade: cert.grade,
        issuedDate: cert.issuedDate,
        status: cert.status,
        qrVerificationUrl: cert.qrVerificationUrl,
      },
    };
  }

  async findAll(req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.certificate.findMany({
      where: { organizationId: orgId },
      include: {
        trainee: { include: { user: true } },
        programme: true,
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async findByTrainee(traineeId: string, req: AppRequest) {
    const orgId = req.tenantId;
    return this.prisma.certificate.findMany({
      where: {
        traineeId,
        organizationId: orgId,
      },
      include: {
        programme: true,
      },
      orderBy: { issuedDate: 'desc' },
    });
  }
}
