import type { ModuleId } from './modules';

export type CapabilityStatus = 'complete' | 'partial' | 'gap';

export interface Capability {
  /** Deliverable letter in the official requirements (A–Q). */
  ref: string;
  name: string;
  module: ModuleId;
  screen: string;
  component: string;
  api: string;
  status: CapabilityStatus;
  /** What is real, and what is not. Never overstated. */
  note: string;
}

/**
 * Requirement traceability: one row per official deliverable.
 * `status` reflects what the running system actually does — not what the design intends.
 */
export const CAPABILITIES: Capability[] = [
  { ref: 'A', name: 'Programme registration', module: 'nominations', screen: '#/app/nominations (trainee)', component: 'NominationsView › TraineeRegistrations', api: 'GET /programmes · POST /nominations/register · GET /nominations/my', status: 'complete', note: 'Trainees discover open programmes and self-register; status is shown against the programme lifecycle.' },
  { ref: 'A', name: 'Nomination & approval workflow', module: 'nominations', screen: '#/app/nominations (staff)', component: 'NominationsView › ReviewDesk', api: 'POST /nominations/:traineeId/nominate · PATCH /nominations/:id/status', status: 'complete', note: 'Approve, waitlist, reject, and enrol into a batch (batch allocation).' },
  { ref: 'A', name: 'Batch allocation', module: 'programmes', screen: '#/app/programmes → Batches', component: 'ProgrammesView › BatchesDrawer', api: 'GET/POST /programmes/:id/batches', status: 'complete', note: 'Batches carry a trainer and capacity; enrolment picks a batch.' },
  { ref: 'B', name: 'Participant / trainee profiles', module: 'trainees', screen: '#/app/trainees', component: 'TraineesView › LearningIdentity', api: 'GET /trainees · GET /trainees/:id', status: 'partial', note: 'A connected learning identity (person → programmes → skills → certificates → employment). Onboarding a new trainee is API-only; there is no form.' },
  { ref: 'B', name: 'Trainer profiles', module: 'trainees', screen: '#/app/trainees → Trainers', component: 'TraineesView › TrainersTab', api: 'GET /trainers', status: 'complete', note: 'Read-only profiles with specialisation and workload.' },
  { ref: 'B', name: 'Institution profiles', module: 'trainees', screen: '#/app/trainees → Institutions · Ecosystem', component: 'TraineesView › InstitutionsTab, ExplorerView', api: 'GET /organizations', status: 'partial', note: 'Read-only profiles and drill-down. Creating an institution is API-only.' },
  { ref: 'C', name: 'Multilingual e-learning (EN / हिंदी / తెలుగు)', module: 'lms', screen: '#/app/lms', component: 'LmsView', api: 'GET /lms/courses · /lms/lessons/:id · /lms/lessons/:id/translations/:lang', status: 'partial', note: 'Full UI with language switching. The seeded NCCT tenant has no LMS content, so it shows an empty catalogue until courses are published.' },
  { ref: 'D', name: 'QR attendance', module: 'attendance', screen: '#/app/attendance', component: 'AttendanceStudioView', api: 'POST /attendance/sessions/:id/qr-code · /qr-scan', status: 'partial', note: 'Signed, rotating QR with a cinematic check-in. The backend only accepts legacy attendance sessions, so timetable sessions return 404 until it is fixed.' },
  { ref: 'D', name: 'Face recognition', module: 'attendance', screen: '#/app/attendance → Face', component: 'AttendanceStudioView › FaceUnavailable', api: 'POST /attendance/sessions/:id/face-verify', status: 'gap', note: 'No recognition provider is connected and the endpoint trusts a client-supplied score. The UI states this rather than simulating a scan.' },
  { ref: 'E', name: 'Timetable with conflict detection', module: 'timetable', screen: '#/app/timetable', component: 'TimetableView', api: 'GET/POST /timetable/sessions', status: 'complete', note: 'Week and day-timeline views; trainer, room and batch conflicts are flagged live and enforced by the server.' },
  { ref: 'F', name: 'Hostel management', module: 'hostel-logistics', screen: '#/app/hostel-logistics', component: 'HostelLogisticsView › Hostel', api: 'GET/POST /hostels · /hostels/occupancy · POST /hostels/allocations', status: 'partial', note: 'Capacity → occupied → available, room grid, bed allocation. Check-in/out endpoints exist but there is no allocation list endpoint to drive them.' },
  { ref: 'F', name: 'Logistics management', module: 'hostel-logistics', screen: '#/app/hostel-logistics → Logistics', component: 'HostelLogisticsView › Logistics', api: 'GET/POST /logistics · PATCH /logistics/:id/status', status: 'complete', note: 'Per-programme requirements with a status pipeline.' },
  { ref: 'G', name: 'Assessments', module: 'lms', screen: '#/app/lms → Assessments', component: 'LmsView › AssessmentsPanel', api: '— (no endpoint)', status: 'gap', note: 'The database models exist but the API exposes no assessment routes, so scores and eligibility cannot be shown. The panel says so.' },
  { ref: 'G', name: 'Certification & credential history', module: 'certificates', screen: '#/app/certificates', component: 'CertificatesView, CredentialCard', api: 'GET /certifications · POST /certifications/issue', status: 'complete', note: 'Issue, list and print. Learners see their own credentials from their dashboard record.' },
  { ref: 'H', name: 'Skill certification repository', module: 'skills', screen: '#/app/skills', component: 'SkillsView, SkillGraph', api: 'GET /trainees/:id · analytics/trainee · public verify (evidence)', status: 'partial', note: 'Skill graph with level and certificate evidence. Assigning skills is API-only.' },
  { ref: 'I', name: 'Public certificate verification', module: 'certificates', screen: '#/verify/:number', component: 'PublicVerifyModal', api: 'GET /certifications/:code/verify (public)', status: 'complete', note: 'A registry lookup that returns holder, programme, issuer and status. It is not a cryptographic signature check, and the UI does not claim one.' },
  { ref: 'J', name: 'Career counselling assistant', module: 'career', screen: '#/app/career', component: 'CareerAssistantView', api: 'POST /career/chat · GET /career/recommendations', status: 'complete', note: 'Rule-based, grounded in catalogue, vacancies and the learner\'s own record. Never queries the database directly.' },
  { ref: 'K', name: 'Recruiter dashboard & talent matching', module: 'home', screen: '#/app (recruiter) · #/app/employment', component: 'RecruiterHome, MatchNetwork', api: 'GET /employment/jobs/:id/candidates · analytics/employer', status: 'complete', note: 'Job → required skills → verified candidates, drawn as a network. Shortlisting and interview scheduling have no API endpoint, so those KPIs can be read but not changed here.' },
  { ref: 'L', name: 'Employment exchange', module: 'employment', screen: '#/app/employment', component: 'EmploymentExchangeView', api: 'GET/POST /employment/jobs · /apply · /applications · /outcomes', status: 'complete', note: 'Discovery, application, and recorded placement outcomes. There is no endpoint to list placements or to change an application\'s status, so those steps are shown as unavailable.' },
  { ref: 'M', name: 'Mobile-first learning', module: 'lms', screen: 'all screens ≤ 820px', component: 'Rail (bottom bar), responsive layouts', api: '—', status: 'complete', note: 'Bottom navigation, adaptive grids, reduced 3D on phones.' },
  { ref: 'N', name: 'Offline-accessible learning', module: 'lms', screen: '#/app/lms · top bar sync status', component: 'offlineStore (IndexedDB), OfflineChip, LmsView', api: 'POST /lms/sync', status: 'partial', note: 'Lessons download to IndexedDB and progress queues locally. The server acknowledges sync but, for trainees, does not yet persist it.' },
  { ref: 'P', name: 'Data analytics', module: 'analytics', screen: '#/app/analytics', component: 'AnalyticsView', api: 'analytics/* · /trainees · /employment/*', status: 'partial', note: 'Training, institutions, skills, employment and outreach — from the data the API exposes. Assessment performance is unavailable.' },
  { ref: 'O', name: 'Centralised database & national monitoring', module: 'ecosystem', screen: '#/app · #/app/ecosystem', component: 'NcctHome, ExplorerView', api: 'analytics/ncct-command-center · GET /organizations · tenant-scoped reads', status: 'complete', note: 'National → institution → programme → trainee, read live across tenants.' },
  { ref: 'Q', name: 'Integration / system architecture', module: 'ecosystem', screen: '#/app/ecosystem → Architecture', component: 'ArchitectureDiagram', api: 'GET /health', status: 'complete', note: 'Users → web/mobile → ERP → LMS → attendance → analytics → certification → employment, with live API and database status.' },
];

export const STATUS_LABEL: Record<CapabilityStatus, string> = { complete: 'Complete', partial: 'Partial', gap: 'Backend gap' };
