import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AppRequest } from '../types/request-context';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: AppRequest, res: Response, next: NextFunction) {
    const tenantHeader = (req.headers['x-tenant-id'] || req.headers['x-org-id']) as string;
    const slugHeader = (req.headers['x-tenant-slug'] || req.headers['x-org-slug']) as string;

    if (tenantHeader) {
      req.tenantId = tenantHeader;
      res.setHeader('x-tenant-id', tenantHeader);
      return next();
    }

    if (slugHeader) {
      try {
        const org = await this.prisma.organization.findUnique({
          where: { slug: slugHeader },
          select: { id: true },
        });
        if (org) {
          req.tenantId = org.id;
          res.setHeader('x-tenant-id', org.id);
        }
      } catch (err) {
        // Fall through gracefully; tenant isolation guard will check if tenant is required
      }
    }

    next();
  }
}
