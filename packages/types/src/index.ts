export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  HOD = 'HOD',
  FACULTY = 'FACULTY',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  FINANCE = 'FINANCE',
  HR = 'HR',
  LIBRARIAN = 'LIBRARIAN',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum AttendanceMethod {
  MANUAL = 'MANUAL',
  QR = 'QR',
  BIOMETRIC = 'BIOMETRIC',
  FACE = 'FACE',
  EXTERNAL_API = 'EXTERNAL_API',
}

export enum AssessmentType {
  INTERNAL = 'INTERNAL',
  QUIZ = 'QUIZ',
  MIDTERM = 'MIDTERM',
  ENDTERM = 'ENDTERM',
  ASSIGNMENT = 'ASSIGNMENT',
  PROJECT = 'PROJECT',
}

export enum AssessmentAttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  EVALUATED = 'EVALUATED',
  ABANDONED = 'ABANDONED',
}

export enum CourseType {
  CORE = 'CORE',
  ELECTIVE = 'ELECTIVE',
  LAB = 'LAB',
  PROJECT = 'PROJECT',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
    requestId: string;
    details?: any;
  };
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  isSuperAdmin: boolean;
  activeOrganizationId?: string;
  role?: Role;
  permissions?: string[];
}

export interface RequestTenantContext {
  organizationId: string;
  organizationSlug?: string;
  organizationName?: string;
}

export interface AuditEventPayload {
  organizationId?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
}
