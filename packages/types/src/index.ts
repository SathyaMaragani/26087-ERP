export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  NCCT_ADMIN = 'NCCT_ADMIN',
  INSTITUTION_ADMIN = 'INSTITUTION_ADMIN',
  COORDINATOR = 'COORDINATOR',
  TRAINER = 'TRAINER',
  TRAINEE = 'TRAINEE',
  EMPLOYER = 'EMPLOYER',
  STAFF = 'STAFF',
  // Educational / legacy mappings
  PRINCIPAL = 'PRINCIPAL',
  HOD = 'HOD',
  FACULTY = 'FACULTY',
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

export enum InstitutionType {
  NCCT_HQ = 'NCCT_HQ',
  VAMNICOM = 'VAMNICOM',
  RICM = 'RICM',
  ICM = 'ICM',
  PARTNER_INSTITUTION = 'PARTNER_INSTITUTION',
  COOPERATIVE_SOCIETY = 'COOPERATIVE_SOCIETY',
}

export enum TraineeType {
  COOPERATIVE_PERSONNEL = 'COOPERATIVE_PERSONNEL',
  PACS_MEMBER = 'PACS_MEMBER',
  SHG_MEMBER = 'SHG_MEMBER',
  DAIRY_COOPERATIVE_MEMBER = 'DAIRY_COOPERATIVE_MEMBER',
  FARMER = 'FARMER',
  RURAL_YOUTH = 'RURAL_YOUTH',
  OTHER = 'OTHER',
}

export enum NominationType {
  SELF = 'SELF',
  INSTITUTIONAL = 'INSTITUTIONAL',
}

export enum RegistrationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
  ENROLLED = 'ENROLLED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ProgrammeMode {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  BLENDED = 'BLENDED',
}

export enum ProgrammeStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum HostelAllocationStatus {
  RESERVED = 'RESERVED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
}

export enum LogisticsStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
}

export enum CertificateStatus {
  ISSUED = 'ISSUED',
  REVOKED = 'REVOKED',
}

export enum JobApplicationStatus {
  APPLIED = 'APPLIED',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEWED = 'INTERVIEWED',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
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
