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

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  instituteName: string;
  organizationId: string;
  avatar?: string;
}

export const DEMO_PERSONAS: UserPersona[] = [
  {
    id: 'usr-admin-1',
    name: 'Dr. Rajiv Sinha',
    email: 'ncct.admin@ncct.gov.in',
    role: 'NCCT_ADMIN',
    title: 'Director General & Apex Admin',
    instituteName: 'NCCT National Headquarters, New Delhi',
    organizationId: 'org-ncct-hq',
  },
  {
    id: 'usr-dir-1',
    name: 'Dr. V. K. Rao',
    email: 'director@ricm-hyd.ac.in',
    role: 'RICM_DIRECTOR',
    title: 'Director & Chief Executive',
    instituteName: 'RICM Hyderabad, Telangana',
    organizationId: 'org-ricm-hyd',
  },
  {
    id: 'usr-coord-1',
    name: 'Ananya Sharma',
    email: 'coordinator@ricm-hyd.ac.in',
    role: 'RICM_COORDINATOR',
    title: 'Senior Training Coordinator',
    instituteName: 'RICM Hyderabad, Telangana',
    organizationId: 'org-ricm-hyd',
  },
  {
    id: 'usr-trainer-1',
    name: 'Prof. Ramesh Gupta',
    email: 'prof.sharma@ricm-hyd.ac.in',
    role: 'TRAINER',
    title: 'Lead Faculty - PACS & Cooperative Accounting',
    instituteName: 'RICM Hyderabad, Telangana',
    organizationId: 'org-ricm-hyd',
  },
  {
    id: 'usr-trainee-1',
    name: 'Ramesh Kumar',
    email: 'ramesh.kumar@rural.in',
    role: 'TRAINEE',
    title: 'Rural Trainee (Warangal PACS)',
    instituteName: 'Warangal PACS / RICM Hyderabad',
    organizationId: 'org-ricm-hyd',
  },
  {
    id: 'usr-recruiter-1',
    name: 'Vikram Joshi',
    email: 'recruiter@markfed.telangana.gov.in',
    role: 'RECRUITER',
    title: 'Head of Talent & Recruitment',
    instituteName: 'Telangana State Markfed',
    organizationId: 'org-ricm-hyd',
  },
];

