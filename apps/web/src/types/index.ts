export type Role =
  | 'SUPER_ADMIN'
  | 'NCCT_ADMIN'
  | 'INSTITUTION_ADMIN'
  | 'COORDINATOR'
  | 'TRAINER'
  | 'TRAINEE'
  | 'EMPLOYER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  institutionType?: string;
  state?: string;
  district?: string;
  code?: string;
}

export interface TrainingProgramme {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  description: string;
  category: string;
  targetAudience: string;
  mode: 'OFFLINE' | 'ONLINE' | 'BLENDED';
  durationDays: number;
  startDate: string;
  endDate: string;
  capacity: number;
  location: string;
  hostelRequired: boolean;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  _count?: {
    batches: number;
    registrations: number;
    certificates: number;
  };
}

export interface ProgrammeBatch {
  id: string;
  programmeId: string;
  batchCode: string;
  name: string;
  startDate: string;
  endDate: string;
  capacity: number;
  trainer?: {
    user: { firstName: string; lastName: string; email: string };
  };
}

export interface ProgrammeRegistration {
  id: string;
  programmeId: string;
  traineeId: string;
  nominationType: 'SELF' | 'INSTITUTIONAL';
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'WAITLISTED' | 'ENROLLED' | 'REJECTED';
  remarks?: string;
  appliedDate?: string;
  createdAt: string;
  trainee: {
    traineeCode: string;
    traineeType: string;
    cooperativeName?: string;
    user: { firstName: string; lastName: string; email: string; phone?: string };
  };
  programme?: TrainingProgramme;
  batch?: ProgrammeBatch;
}

export interface TraineeProfile {
  id: string;
  userId: string;
  traineeCode: string;
  traineeType: string;
  cooperativeName?: string;
  pacsName?: string;
  state?: string;
  district?: string;
  village?: string;
  phone?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  skills?: Array<{
    skill: { name: string; category?: { name: string } };
    proficiencyLevel: string;
  }>;
  certificates?: Certificate[];
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  title: string;
  grade?: string;
  issuedDate: string;
  status: 'ISSUED' | 'REVOKED';
  qrVerificationUrl: string;
  skillsAcquired: string[];
  programme?: { title: string; code: string };
  trainee?: {
    traineeCode: string;
    user: { firstName: string; lastName: string };
  };
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  location: string;
  vacancies: number;
  salaryRange?: string;
  status: string;
  createdAt: string;
  employer?: {
    companyName: string;
    sector: string;
    city?: string;
  };
}

export interface CandidateMatch {
  traineeId: string;
  traineeName: string;
  email: string;
  cooperativeAffiliation?: string;
  matchScorePercent: number;
  matchedSkills: string[];
  missingSkills: string[];
  hasCertificate: boolean;
}

export interface HostelOccupancy {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRatePercent: number;
}

export interface LogisticsItem {
  id: string;
  category: 'KIT' | 'MEAL' | 'EQUIPMENT' | 'TRANSPORT' | 'VENUE';
  title: string;
  quantity: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED';
  vendorName?: string;
  cost?: number;
}

/** Roles as the interface models them. Mapped from backend roles in state/auth. */
export type UiRole =
  | 'NCCT_ADMIN'
  | 'RICM_DIRECTOR'
  | 'RICM_COORDINATOR'
  | 'TRAINER'
  | 'TRAINEE'
  | 'RECRUITER';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: UiRole;
  title: string;
  instituteName: string;
  organizationId: string;
  /** Present for TRAINEE sessions once the trainee profile has resolved. */
  traineeId?: string;
}

export const ROLE_META: Record<UiRole, { label: string; title: string; blurb: string }> = {
  NCCT_ADMIN: { label: 'NCCT Apex Admin', title: 'National Command', blurb: 'National KPIs, cross-institution curriculum and state analytics.' },
  RICM_DIRECTOR: { label: 'Institution Director', title: 'Institution Command', blurb: 'Campus operations, hostel, certificates and institutional analytics.' },
  RICM_COORDINATOR: { label: 'Programme Coordinator', title: 'Operations Cockpit', blurb: 'Nominations, approvals, batches and timetable conflicts.' },
  TRAINER: { label: 'Faculty / Trainer', title: 'Teaching Workspace', blurb: 'Rotating QR attendance, sessions and learner progress.' },
  TRAINEE: { label: 'Trainee', title: 'My Learning', blurb: 'Multilingual lessons, offline sync, certificates and jobs.' },
  RECRUITER: { label: 'Cooperative Recruiter', title: 'Talent Intelligence', blurb: 'Vacancies, skill-matched candidates and verified credentials.' },
};

/** Backend membership role -> interface role. */
export function toUiRole(backendRole: string | undefined, isSuperAdmin?: boolean): UiRole {
  switch (backendRole) {
    case 'NCCT_ADMIN':
      return 'NCCT_ADMIN';
    case 'INSTITUTION_ADMIN':
    case 'PRINCIPAL':
      return 'RICM_DIRECTOR';
    case 'COORDINATOR':
      return 'RICM_COORDINATOR';
    case 'TRAINER':
    case 'FACULTY':
    case 'HOD':
      return 'TRAINER';
    case 'TRAINEE':
    case 'STUDENT':
      return 'TRAINEE';
    case 'EMPLOYER':
      return 'RECRUITER';
    default:
      return isSuperAdmin ? 'NCCT_ADMIN' : 'TRAINEE';
  }
}

/** Seeded demo accounts, surfaced on the login screen in development builds only. */
export const DEMO_ACCOUNTS: Array<{ role: UiRole; name: string; email: string; password: string }> = [
  { role: 'NCCT_ADMIN', name: 'National Director', email: 'ncct.admin@ncct.gov.in', password: 'Admin@123' },
  { role: 'RICM_DIRECTOR', name: 'RICM Director', email: 'director@ricm-hyd.ac.in', password: 'Admin@123' },
  { role: 'RICM_COORDINATOR', name: 'Programme Coordinator', email: 'coordinator@ricm-hyd.ac.in', password: 'Coordinator@123' },
  { role: 'TRAINER', name: 'Faculty', email: 'prof.sharma@ricm-hyd.ac.in', password: 'Trainer@123' },
  { role: 'TRAINEE', name: 'Trainee', email: 'ramesh.kumar@rural.in', password: 'Trainee@123' },
  { role: 'RECRUITER', name: 'Recruiter', email: 'recruiter@markfed.telangana.gov.in', password: 'Employer@123' },
];
