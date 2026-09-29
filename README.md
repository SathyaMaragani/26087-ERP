# NCCT National Cooperative ERP & LMS Platform

> **Ministry of Cooperation, Government of India**  
> Unified Multi-Tenant Institution Operating System, Multilingual LMS, Verifiable Digital Certification, and Employment Exchange for the National Council for Cooperative Training (NCCT) ecosystem (14 RICMs & 5 ICMs).

---

## 🌟 Overview & Key Problem Statement

The **National Council for Cooperative Training (NCCT)** operates apex training institutes nationwide, including 14 Regional Institutes of Cooperative Management (RICMs) and 5 Institutes of Cooperative Management (ICMs).

This enterprise platform addresses the core cooperative education and operational challenges:
- **Unified Multi-Tenancy**: Centralized National HQ governance with complete institutional tenant isolation.
- **Academic & Operational Core**: Training calendar, batch lifecycle, institutional nominations, and real-time conflict-free timetable scheduling.
- **Smart Attendance**: Dynamic rotating QR codes (60-second rotation counter) to eliminate proxy attendance, coupled with decoupled biometric facial recognition with explicit privacy consent.
- **Campus & Logistics**: Real-time hostel room/bed occupancy gauges and logistical supply kit delivery tracking.
- **Multilingual Learning for Rural Youth**: LMS offering seamless instant translation (English, हिंदी, తెలుగు) and rural offline simulation with a client-side sync queue.
- **Verifiable Digital Credentials**: Cryptographically signed certificates with SHA-256 signatures and a zero-authentication public QR verification engine.
- **Employment Exchange**: Cooperative job board with an algorithmic AI Candidate Skill-Matching Engine (% competency score calculation) and 1-click apply.
- **Grounded AI Career Counselor**: Chatbot assistant bounded strictly by the NCCT course catalog and national cooperative job openings.

---

## 🛠️ Architecture & Technology Stack

- **Monorepo Architecture**: Managed with `pnpm` workspaces.
  - `apps/api`: NestJS enterprise backend with TypeScript, PostgreSQL, and Prisma ORM.
  - `apps/web`: Vite + React + TypeScript with vanilla CSS glassmorphic design system.
  - `packages/types`: Shared cross-platform TypeScript interfaces and contracts.
- **Database & Isolation**: PostgreSQL with 22 Prisma data models, multi-tenant row-level isolation via tenant middleware/guards.
- **Authentication & Security**: JWT authentication with refresh token rotation, bcrypt password hashing, and role-based access control (RBAC) across 6 distinct user personas.
- **Testing**: 31 comprehensive Vitest automated unit and end-to-end (E2E) integration test suites.

---

## 👥 Personas & Roles Supported

| Persona | Role Key | Focus Area |
| :--- | :--- | :--- |
| **NCCT Apex Admin** | `NCCT_ADMIN` | National Command Center, aggregate KPIs, cross-institution curriculum & state analytics. |
| **RICM Director** | `RICM_DIRECTOR` | Institutional dashboard, hostel oversight, digital certificate issuance & keys. |
| **Programme Coordinator** | `RICM_COORDINATOR` | Candidate nominations, approvals, batch scheduling & conflict detection. |
| **Faculty / Trainer** | `TRAINER` | Dynamic 60s rotating QR generation, facial attendance verify, course delivery. |
| **Rural Trainee** | `TRAINEE` | Multilingual LMS, offline sync, QR attendance scan, certificates & 1-click job apply. |
| **Cooperative Recruiter** | `RECRUITER` | Post vacancies, AI Candidate Skill-Matching Engine, review verified profiles. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **PostgreSQL** database instance

### 1. Installation
```bash
git clone https://github.com/SathyaMaragani/26087-ERP.git
cd 26087-ERP
pnpm install
```

### 2. Environment Setup
Configure your `apps/api/.env` file:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erplms_db?schema=public"
JWT_SECRET="super-secret-ncct-jwt-key"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="super-secret-ncct-refresh-key"
JWT_REFRESH_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Database Migration & Seeding
```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

### 4. Running the Development Servers
In separate terminals (or concurrently):

**Start the NestJS API Backend:**
```bash
pnpm dev:api
```
- API Base: `http://localhost:4000/api/v1`
- Swagger Docs: `http://localhost:4000/api/docs`
- Health Check: `http://localhost:4000/health`

**Start the Vite Frontend Web App:**
```bash
pnpm dev:web
```
- Web Application: `http://localhost:5173`

---

## 🧪 Testing & Verification

Run the comprehensive automated test suite:
```bash
pnpm test:api
```
Run frontend production build verification:
```bash
pnpm build:web
```

---

## 📄 License
This project is licensed under the Apache 2.0 License - see the LICENSE file for details.
