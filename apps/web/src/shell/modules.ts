import {
  Award, BarChart3, BookOpen, Bot, Briefcase, Calendar, Clock, Compass, Home, Network, QrCode, Sprout, UserCheck, Users,
  type LucideIcon,
} from 'lucide-react';
import type { UiRole } from '../types';

export type ModuleId =
  | 'home' | 'programmes' | 'nominations' | 'trainees' | 'timetable' | 'attendance'
  | 'hostel-logistics' | 'lms' | 'skills' | 'certificates' | 'employment' | 'career' | 'analytics' | 'ecosystem';

/** The master product story. Every screen sits somewhere on this line. */
export const LIFECYCLE = [
  { id: 'REACH', label: 'Reach', blurb: 'Connect rural youth and cooperative stakeholders' },
  { id: 'REGISTER', label: 'Register', blurb: 'Programme discovery, registration and nomination' },
  { id: 'TRAIN', label: 'Train', blurb: 'Learning, multimedia education and digital literacy' },
  { id: 'ATTEND', label: 'Attend', blurb: 'QR and face-based attendance' },
  { id: 'ASSESS', label: 'Assess', blurb: 'Tests, assignments and evaluations' },
  { id: 'SKILL', label: 'Skill', blurb: 'Identify and develop skills' },
  { id: 'CERTIFY', label: 'Certify', blurb: 'Issue trusted digital credentials' },
  { id: 'CONNECT', label: 'Connect', blurb: 'Match skills with employers' },
  { id: 'EMPLOY', label: 'Employ', blurb: 'Applications and employment opportunities' },
  { id: 'MEASURE', label: 'Measure', blurb: 'Track outcomes through analytics' },
  { id: 'IMPROVE', label: 'Improve', blurb: 'Use institutional and national insight to improve future programmes' },
] as const;
export type LifecycleStage = (typeof LIFECYCLE)[number]['id'];

export interface ModuleDef {
  id: ModuleId;
  label: string;
  icon: LucideIcon;
  roles: UiRole[];
  description: string;
  /** Rail grouping, named after the lifecycle. */
  group: string;
  /** Lifecycle stages this module serves, most important first. */
  stages: LifecycleStage[];
}

const ALL: UiRole[] = ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR', 'TRAINER', 'TRAINEE', 'RECRUITER'];
const STAFF: UiRole[] = ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RICM_COORDINATOR'];

export const MODULES: ModuleDef[] = [
  { id: 'home', label: 'Overview', icon: Compass, roles: ALL, description: 'Your command surface', group: 'Overview', stages: [] },
  { id: 'trainees', label: 'People', icon: Users, roles: [...STAFF, 'TRAINER'], description: 'Trainees, trainers and institutions', group: 'Reach & register', stages: ['REACH'] },
  { id: 'nominations', label: 'Nominations', icon: UserCheck, roles: [...STAFF, 'TRAINEE'], description: 'Discover, register, nominate and approve', group: 'Reach & register', stages: ['REGISTER'] },
  { id: 'programmes', label: 'Programmes', icon: Calendar, roles: STAFF, description: 'Training calendar and batches', group: 'Reach & register', stages: ['REGISTER', 'TRAIN'] },
  { id: 'timetable', label: 'Timetable', icon: Clock, roles: [...STAFF, 'TRAINER'], description: 'Sessions with live conflict detection', group: 'Train & attend', stages: ['TRAIN'] },
  { id: 'hostel-logistics', label: 'Hostel & Logistics', icon: Home, roles: STAFF, description: 'Occupancy, allocation and supplies', group: 'Train & attend', stages: ['TRAIN'] },
  { id: 'attendance', label: 'Attendance', icon: QrCode, roles: ['NCCT_ADMIN', 'RICM_COORDINATOR', 'TRAINER', 'TRAINEE'], description: 'Rotating QR attendance', group: 'Train & attend', stages: ['ATTEND'] },
  { id: 'lms', label: 'Learning', icon: BookOpen, roles: [...STAFF, 'TRAINER', 'TRAINEE'], description: 'Multilingual lessons, offline-ready', group: 'Learn & assess', stages: ['TRAIN', 'ASSESS'] },
  { id: 'skills', label: 'Skills', icon: Sprout, roles: [...STAFF, 'TRAINER', 'TRAINEE'], description: 'The skill graph and its evidence', group: 'Skill & certify', stages: ['SKILL'] },
  { id: 'certificates', label: 'Credentials', icon: Award, roles: [...ALL], description: 'Trusted, verifiable certificates', group: 'Skill & certify', stages: ['CERTIFY'] },
  { id: 'employment', label: 'Employment', icon: Briefcase, roles: ['NCCT_ADMIN', 'RICM_DIRECTOR', 'RECRUITER', 'TRAINEE'], description: 'Skill matching, applications, outcomes', group: 'Connect & employ', stages: ['CONNECT', 'EMPLOY'] },
  { id: 'career', label: 'Career Advisor', icon: Bot, roles: ['NCCT_ADMIN', 'RICM_COORDINATOR', 'TRAINEE'], description: 'Guidance grounded in the catalogue and vacancies', group: 'Connect & employ', stages: ['CONNECT'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: STAFF, description: 'Operational questions, answered', group: 'Measure & improve', stages: ['MEASURE'] },
  { id: 'ecosystem', label: 'Ecosystem', icon: Network, roles: STAFF, description: 'Zoom through the network; architecture; capabilities', group: 'Measure & improve', stages: ['IMPROVE'] },
];

export const modulesFor = (role: UiRole) => MODULES.filter((m) => m.roles.includes(role));
export const HomeIcon = Home;

/** First module this role can open for a lifecycle stage (or null when none is available to them). */
export function moduleForStage(role: UiRole, stage: LifecycleStage): ModuleDef | null {
  return modulesFor(role).find((m) => m.stages[0] === stage) ?? modulesFor(role).find((m) => m.stages.includes(stage)) ?? null;
}

export function stagesOf(id: ModuleId): LifecycleStage[] {
  return MODULES.find((m) => m.id === id)?.stages ?? [];
}
