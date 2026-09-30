# NCCT — Requirement Traceability Matrix

> Generated from `apps/web/src/shell/capabilities.ts`, the same registry the app shows under **Ecosystem → Capabilities**. Status reflects what the running system does today, not what the design intends.

**24 traced capabilities** — ✅ 14 complete · 🟡 8 partial · 🔴 2 backend gap

| Ref | Requirement | Route / Screen | Component | Backend / API | Status |
| --- | --- | --- | --- | --- | --- |
| A | **Programme registration**<br><sub>Trainees discover open programmes and self-register; status is shown against the programme lifecycle.</sub> | `#/app/nominations (trainee)` | NominationsView › TraineeRegistrations | `GET /programmes · POST /nominations/register · GET /nominations/my` | ✅ Complete |
| A | **Nomination & approval workflow**<br><sub>Approve, waitlist, reject, and enrol into a batch (batch allocation).</sub> | `#/app/nominations (staff)` | NominationsView › ReviewDesk | `POST /nominations/:traineeId/nominate · PATCH /nominations/:id/status` | ✅ Complete |
| A | **Batch allocation**<br><sub>Batches carry a trainer and capacity; enrolment picks a batch.</sub> | `#/app/programmes → Batches` | ProgrammesView › BatchesDrawer | `GET/POST /programmes/:id/batches` | ✅ Complete |
| B | **Participant / trainee profiles**<br><sub>A connected learning identity (person → programmes → skills → certificates → employment). Onboarding a new trainee is API-only; there is no form.</sub> | `#/app/trainees` | TraineesView › LearningIdentity | `GET /trainees · GET /trainees/:id` | 🟡 Partial |
| B | **Trainer profiles**<br><sub>Read-only profiles with specialisation and workload.</sub> | `#/app/trainees → Trainers` | TraineesView › TrainersTab | `GET /trainers` | ✅ Complete |
| B | **Institution profiles**<br><sub>Read-only profiles and drill-down. Creating an institution is API-only.</sub> | `#/app/trainees → Institutions · Ecosystem` | TraineesView › InstitutionsTab, ExplorerView | `GET /organizations` | 🟡 Partial |
| C | **Multilingual e-learning (EN / हिंदी / తెలుగు)**<br><sub>Full UI with language switching. The seeded NCCT tenant has no LMS content, so it shows an empty catalogue until courses are published.</sub> | `#/app/lms` | LmsView | `GET /lms/courses · /lms/lessons/:id · /lms/lessons/:id/translations/:lang` | 🟡 Partial |
| D | **QR attendance**<br><sub>Signed, rotating QR with a cinematic check-in. The backend only accepts legacy attendance sessions, so timetable sessions return 404 until it is fixed.</sub> | `#/app/attendance` | AttendanceStudioView | `POST /attendance/sessions/:id/qr-code · /qr-scan` | 🟡 Partial |
| D | **Face recognition**<br><sub>No recognition provider is connected and the endpoint trusts a client-supplied score. The UI states this rather than simulating a scan.</sub> | `#/app/attendance → Face` | AttendanceStudioView › FaceUnavailable | `POST /attendance/sessions/:id/face-verify` | 🔴 Backend gap |
| E | **Timetable with conflict detection**<br><sub>Week and day-timeline views; trainer, room and batch conflicts are flagged live and enforced by the server.</sub> | `#/app/timetable` | TimetableView | `GET/POST /timetable/sessions` | ✅ Complete |
| F | **Hostel management**<br><sub>Capacity → occupied → available, room grid, bed allocation. Check-in/out endpoints exist but there is no allocation list endpoint to drive them.</sub> | `#/app/hostel-logistics` | HostelLogisticsView › Hostel | `GET/POST /hostels · /hostels/occupancy · POST /hostels/allocations` | 🟡 Partial |
| F | **Logistics management**<br><sub>Per-programme requirements with a status pipeline.</sub> | `#/app/hostel-logistics → Logistics` | HostelLogisticsView › Logistics | `GET/POST /logistics · PATCH /logistics/:id/status` | ✅ Complete |
| G | **Assessments**<br><sub>The database models exist but the API exposes no assessment routes, so scores and eligibility cannot be shown. The panel says so.</sub> | `#/app/lms → Assessments` | LmsView › AssessmentsPanel | `— (no endpoint)` | 🔴 Backend gap |
| G | **Certification & credential history**<br><sub>Issue, list and print. Learners see their own credentials from their dashboard record.</sub> | `#/app/certificates` | CertificatesView, CredentialCard | `GET /certifications · POST /certifications/issue` | ✅ Complete |
| H | **Skill certification repository**<br><sub>Skill graph with level and certificate evidence. Assigning skills is API-only.</sub> | `#/app/skills` | SkillsView, SkillGraph | `GET /trainees/:id · analytics/trainee · public verify (evidence)` | 🟡 Partial |
| I | **Public certificate verification**<br><sub>A registry lookup that returns holder, programme, issuer and status. It is not a cryptographic signature check, and the UI does not claim one.</sub> | `#/verify/:number` | PublicVerifyModal | `GET /certifications/:code/verify (public)` | ✅ Complete |
| J | **Career counselling assistant**<br><sub>Rule-based, grounded in catalogue, vacancies and the learner's own record. Never queries the database directly.</sub> | `#/app/career` | CareerAssistantView | `POST /career/chat · GET /career/recommendations` | ✅ Complete |
| K | **Recruiter dashboard & talent matching**<br><sub>Job → required skills → verified candidates, drawn as a network. Shortlisting and interview scheduling have no API endpoint, so those KPIs can be read but not changed here.</sub> | `#/app (recruiter) · #/app/employment` | RecruiterHome, MatchNetwork | `GET /employment/jobs/:id/candidates · analytics/employer` | ✅ Complete |
| L | **Employment exchange**<br><sub>Discovery, application, and recorded placement outcomes. There is no endpoint to list placements or to change an application's status, so those steps are shown as unavailable.</sub> | `#/app/employment` | EmploymentExchangeView | `GET/POST /employment/jobs · /apply · /applications · /outcomes` | ✅ Complete |
| M | **Mobile-first learning**<br><sub>Bottom navigation, adaptive grids, reduced 3D on phones.</sub> | `all screens ≤ 820px` | Rail (bottom bar), responsive layouts | `—` | ✅ Complete |
| N | **Offline-accessible learning**<br><sub>Lessons download to IndexedDB and progress queues locally. The server acknowledges sync but, for trainees, does not yet persist it.</sub> | `#/app/lms · top bar sync status` | offlineStore (IndexedDB), OfflineChip, LmsView | `POST /lms/sync` | 🟡 Partial |
| P | **Data analytics**<br><sub>Training, institutions, skills, employment and outreach — from the data the API exposes. Assessment performance is unavailable.</sub> | `#/app/analytics` | AnalyticsView | `analytics/* · /trainees · /employment/*` | 🟡 Partial |
| O | **Centralised database & national monitoring**<br><sub>National → institution → programme → trainee, read live across tenants.</sub> | `#/app · #/app/ecosystem` | NcctHome, ExplorerView | `analytics/ncct-command-center · GET /organizations · tenant-scoped reads` | ✅ Complete |
| Q | **Integration / system architecture**<br><sub>Users → web/mobile → ERP → LMS → attendance → analytics → certification → employment, with live API and database status.</sub> | `#/app/ecosystem → Architecture` | ArchitectureDiagram | `GET /health` | ✅ Complete |

## Backend findings that limit the frontend

These are defects or gaps in the API, not in the interface. The UI states them rather than working around them with simulated data.

1. **Security — password hash exposure.** `GET /trainees/:id` returns the user object including `passwordHash`.
2. **Tenant scoping.** Candidate matching (`GET /employment/jobs/:id/candidates`) evaluates every trainee, and `GET /employment/applications` is not limited to the caller's institution.
3. **QR attendance.** `POST /attendance/sessions/:id/qr-code` only accepts legacy college `AttendanceSession` ids, so it returns 404 for timetable (`TrainingSession`) ids.
4. **Face verification.** The provider is a stub that trusts a client-supplied `livenessConfidence`; there is no recognition engine.
5. **Assessments.** Database models exist but no controller exposes them.
6. **LMS.** `POST /lms/sync` acknowledges trainee progress without persisting it (only college `StudentProfile` users are stored). The seeded NCCT tenant has no LMS courses.
7. **Certificates.** `GET /certifications*` requires `certificate:read`, which trainees lack; they can only see credentials through their dashboard. Verification is a registry lookup with a status check — no SHA-256 signing or checking exists anywhere in the certification service, despite the README describing it.
8. **Employment.** No endpoint changes an application's status (shortlist / interview), and none lists placement outcomes.
9. **Trainee list.** `GET /trainees` omits certificates, so counts are joined from `GET /certifications`.

## Master lifecycle → screens

| Stage | Screen |
| --- | --- |
| Reach | People |
| Register | Nominations · Programmes |
| Train | Timetable · Hostel & Logistics · Learning |
| Attend | Attendance |
| Assess | Learning → Assessments (API gap) |
| Skill | Skills |
| Certify | Credentials · public verification |
| Connect | Employment · Career Advisor |
| Employ | Employment |
| Measure | Analytics |
| Improve | Ecosystem |
