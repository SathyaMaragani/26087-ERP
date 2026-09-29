import { Request } from 'express';
import { Role } from '@erplms/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  activeOrganizationId?: string;
  role?: Role;
  permissions?: string[];
}

export interface AppRequest extends Request {
  requestId: string;
  tenantId?: string;
  user?: AuthenticatedUser;
}
