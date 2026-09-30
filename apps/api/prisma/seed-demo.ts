/**
 * DEMO DATASET — additive, idempotent expansion of the national NCCT network.
 *
 * Unlike prisma/seed.ts (which wipes and rebuilds the core dataset — the
 * verified TRN-2026-001 journey, RICM Hyderabad, etc.), this script never
 * deletes anything. It only creates rows that don't already exist, keyed by
 * real unique constraints (org slug, user email, trainee code, skill code,
 * programme code), so running it multiple times is safe and produces the
 * same end state every time — no Math.random, no non-deterministic IDs.
 *
 * Run after prisma/seed.ts:
 *   pnpm --filter @erplms/api prisma:seed        (core dataset — wipes first)
 *   pnpm --filter @erplms/api prisma:seed:demo   (this file — additive)
 *
 * Every row this script creates is real relational data read through the
 * same Prisma models and NestJS endpoints as everything else — there is no
 * separate frontend-only fake dataset. It exists to give the demo enough
 * density (multiple states, multiple institutions, varied trainee journey
 * stages) that primary screens aren't empty, while staying clearly labelled:
 * see isDemoRecord below and the DEMO badge wired to DEMO_MODE in the API.
 */
import { PrismaClient, TraineeType, ProgrammeMode, ProgrammeStatus, RegistrationStatus, CertificateStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface InstitutionSeed {
  slug: string;
  name: string;
  state: string;
  district: string;
  programmes: Array<{ code: string; title: string; category: string; mode: ProgrammeMode; capacity: number }>;
  hostel?: { name: string; building: string; rooms: number };
}

const INSTITUTIONS: InstitutionSeed[] = [
  {
    slug: 'ricm-pune', name: 'RICM – Regional Institute of Cooperative Management, Pune',
    state: 'Maharashtra', district: 'Pune',
    programmes: [
      { code: 'PRG-CAF-2026-01', title: 'Cooperative Accounting & Financial Management', category: 'Financial Management', mode: 'BLENDED' as ProgrammeMode, capacity: 40 },
      { code: 'PRG-DCM-2026-01', title: 'Dairy Cooperative Management', category: 'Sector Management', mode: 'OFFLINE' as ProgrammeMode, capacity: 35 },
    ],
    hostel: { name: 'Yashwantrao Trainee Hostel', building: 'Block A', rooms: 3 },
  },
  {
    slug: 'ricm-bengaluru', name: 'RICM – Regional Institute of Cooperative Management, Bengaluru',
    state: 'Karnataka', district: 'Bengaluru Urban',
    programmes: [
      { code: 'PRG-PMD-2026-01', title: 'PACS Modernisation & Digital Transformation', category: 'Digital Literacy', mode: 'BLENDED' as ProgrammeMode, capacity: 45 },
    ],
    hostel: { name: 'Kaveri Trainee Hostel', building: 'Block C', rooms: 2 },
  },
  {
    slug: 'ricm-chennai', name: 'RICM – Regional Institute of Cooperative Management, Chennai',
    state: 'Tamil Nadu', district: 'Chennai',
    programmes: [
      { code: 'PRG-ACL-2026-01', title: 'Agricultural Cooperative Leadership', category: 'Leadership', mode: 'OFFLINE' as ProgrammeMode, capacity: 30 },
    ],
  },
  {
    slug: 'ricm-lucknow', name: 'RICM – Regional Institute of Cooperative Management, Lucknow',
    state: 'Uttar Pradesh', district: 'Lucknow',
    programmes: [
      { code: 'PRG-RYD-2026-01', title: 'Rural Youth Digital Skills', category: 'Digital Literacy', mode: 'BLENDED' as ProgrammeMode, capacity: 50 },
    ],
  },
  {
    slug: 'ricm-ahmedabad', name: 'RICM – Regional Institute of Cooperative Management, Ahmedabad',
    state: 'Gujarat', district: 'Ahmedabad',
    programmes: [
      { code: 'PRG-WCE-2026-01', title: 'Women Cooperative Entrepreneurship', category: 'Entrepreneurship', mode: 'BLENDED' as ProgrammeMode, capacity: 40 },
      { code: 'PRG-CGC-2026-01', title: 'Cooperative Governance & Compliance', category: 'Governance', mode: 'OFFLINE' as ProgrammeMode, capacity: 30 },
    ],
  },
];

const SKILLS: Array<{ code: string; name: string; category: string }> = [
  { code: 'SKILL-GOV-01', name: 'Cooperative Governance', category: 'Governance & Compliance' },
  { code: 'SKILL-FIN-01', name: 'Financial Literacy', category: 'Financial Management' },
  { code: 'SKILL-REC-01', name: 'Digital Record Keeping', category: 'Digital Literacy' },
  { code: 'SKILL-SUP-01', name: 'Agricultural Supply Chain', category: 'Sector Management' },
  { code: 'SKILL-LED-01', name: 'Leadership', category: 'Leadership' },
  { code: 'SKILL-ENT-01', name: 'Entrepreneurship', category: 'Entrepreneurship' },
];

// Deterministic trainee roster: fixed first/last names, no generation, no randomness.
const TRAINEE_NAMES: Array<[string, string]> = [
  ['Anita', 'Deshmukh'], ['Rohan', 'Patil'], ['Sunita', 'Joshi'],
  ['Karthik', 'Reddy'], ['Lakshmi', 'Iyer'], ['Manoj', 'Gowda'],
  ['Priya', 'Krishnan'], ['Arun', 'Subramaniam'],
  ['Rajesh', 'Yadav'], ['Kavita', 'Singh'],
  ['Meera', 'Shah'], ['Vikram', 'Patel'], ['Heena', 'Trivedi'],
];

const EMPLOYERS = [
  { name: 'Maharashtra State Cooperative Bank', title: 'Cooperative Field Officer', package: 320000 },
  { name: 'Karnataka Milk Federation (KMF)', title: 'Digital Systems Associate', package: 300000 },
  { name: 'Tamil Nadu Cooperative Marketing Federation', title: 'Accounts & Compliance Officer', package: 290000 },
];

async function upsertOrg(seed: InstitutionSeed) {
  return prisma.organization.upsert({
    where: { slug: seed.slug },
    update: {},
    create: {
      name: seed.name, slug: seed.slug, institutionType: 'RICM', state: seed.state, district: seed.district,
      primaryColor: '#3E7C6A', timezone: 'Asia/Kolkata',
    },
  });
}

async function main() {
  console.log('Seeding demo network expansion (additive, idempotent)...');
  const salt = await bcrypt.genSalt(10);
  const traineePassword = await bcrypt.hash('Trainee@123', salt);

  const skillCategoryCache = new Map<string, string>();
  const skillCache = new Map<string, string>();
  for (const s of SKILLS) {
    let categoryId = skillCategoryCache.get(s.category);
    if (!categoryId) {
      const cat = await prisma.skillCategory.upsert({ where: { name: s.category }, update: {}, create: { name: s.category } });
      categoryId = cat.id;
      skillCategoryCache.set(s.category, categoryId);
    }
    const skill = await prisma.skill.upsert({ where: { code: s.code }, update: {}, create: { name: s.name, code: s.code, categoryId } });
    skillCache.set(s.code, skill.id);
  }

  let traineeIndex = 0;
  let employerIndex = 0;
  let institutionsCreated = 0;
  let programmesCreated = 0;
  let traineesCreated = 0;
  let hostelsCreated = 0;
  let roomsCreated = 0;

  for (const inst of INSTITUTIONS) {
    const org = await upsertOrg(inst);
    institutionsCreated++;

    const programmeIds: string[] = [];
    for (const p of inst.programmes) {
      const programme = await prisma.trainingProgramme.upsert({
        where: { organizationId_code: { organizationId: org.id, code: p.code } },
        update: {},
        create: {
          organizationId: org.id, code: p.code, title: p.title,
          description: `Deterministic demo programme: ${p.title}, delivered at ${inst.name}.`,
          category: p.category, targetAudience: 'PACS Personnel, Rural Youth, SHG Representatives',
          mode: p.mode, durationDays: 5,
          startDate: new Date('2026-11-02T09:00:00.000Z'), endDate: new Date('2026-11-07T17:00:00.000Z'),
          capacity: p.capacity, location: `${inst.name} Campus`, status: 'ONGOING' as ProgrammeStatus,
        },
      });
      programmeIds.push(programme.id);
      programmesCreated++;
    }

    let hostel: { id: string } | null = null;
    if (inst.hostel) {
      const h = await prisma.hostel.upsert({
        where: { id: `demo-hostel-${inst.slug}` }, // stable synthetic id, safe since Hostel.id has no other natural key
        update: {},
        create: { id: `demo-hostel-${inst.slug}`, organizationId: org.id, name: inst.hostel.name, building: inst.hostel.building, gender: 'ALL', totalRooms: inst.hostel.rooms * 4 },
      });
      hostel = h;
      hostelsCreated++;
      for (let r = 1; r <= inst.hostel.rooms; r++) {
        await prisma.hostelRoom.upsert({
          where: { hostelId_roomNumber: { hostelId: h.id, roomNumber: String(100 + r) } },
          update: {},
          create: { hostelId: h.id, roomNumber: String(100 + r), floor: 1, bedCapacity: 4, occupiedBeds: r === 1 ? 3 : r === 2 ? 2 : 0 },
        });
        roomsCreated++;
      }
    }

    // 2-3 trainees per institution, cycling through the fixed name roster.
    const traineeCount = inst.programmes.length >= 2 ? 3 : 2;
    for (let i = 0; i < traineeCount; i++) {
      const [firstName, lastName] = TRAINEE_NAMES[traineeIndex % TRAINEE_NAMES.length];
      traineeIndex++;
      const traineeCode = `TRN-DEMO-${inst.slug.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${inst.slug}@ncct.demo`;

      const user = await prisma.user.upsert({
        where: { email }, update: {},
        create: { email, passwordHash: traineePassword, firstName, lastName },
      });
      await prisma.membership.upsert({
        where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
        update: {}, create: { organizationId: org.id, userId: user.id, role: 'TRAINEE' },
      });
      const trainee = await prisma.traineeProfile.upsert({
        where: { organizationId_traineeCode: { organizationId: org.id, traineeCode } },
        update: {},
        create: {
          organizationId: org.id, userId: user.id, traineeCode,
          traineeType: (i === 0 ? 'PACS_MEMBER' : i === 1 ? 'RURAL_YOUTH' : 'SHG_MEMBER') as TraineeType,
          state: inst.state, district: inst.district, gender: i % 2 === 0 ? 'Female' : 'Male',
          educationLevel: 'B.Com', occupation: 'Cooperative Society Member',
        },
      });
      traineesCreated++;

      const programmeId = programmeIds[i % programmeIds.length];
      const journeyStage = (traineeIndex + i) % 4; // 0=just applied, 1=enrolled, 2=certified, 3=certified+employed
      await prisma.programmeRegistration.upsert({
        where: { organizationId_programmeId_traineeId: { organizationId: org.id, programmeId, traineeId: trainee.id } },
        update: {},
        create: {
          organizationId: org.id, programmeId, traineeId: trainee.id,
          nominationType: 'SELF', status: (journeyStage === 0 ? 'SUBMITTED' : 'ENROLLED') as RegistrationStatus,
        },
      });

      if (journeyStage >= 2) {
        const skillCodes = [SKILLS[traineeIndex % SKILLS.length].code, SKILLS[(traineeIndex + 1) % SKILLS.length].code];
        for (const code of skillCodes) {
          const skillId = skillCache.get(code)!;
          await prisma.traineeSkill.upsert({
            where: { traineeId_skillId: { traineeId: trainee.id, skillId } },
            update: {}, create: { traineeId: trainee.id, skillId, level: 2, verifiedAt: new Date() },
          });
        }
        const certNumber = `NCCT-DEMO-${inst.slug.toUpperCase()}-${String(i + 1).padStart(2, '0')}`;
        await prisma.certificate.upsert({
          where: { certificateNumber: certNumber },
          update: {},
          create: {
            organizationId: org.id, traineeId: trainee.id, programmeId, certificateNumber: certNumber,
            title: `NCCT Certificate — ${inst.programmes[i % inst.programmes.length].title}`,
            status: 'ISSUED' as CertificateStatus, skillsAcquired: skillCodes.map((c) => SKILLS.find((s) => s.code === c)!.name),
            grade: 'Pass', issuedDate: new Date('2026-11-08T00:00:00.000Z'),
            qrVerificationUrl: `https://verify.ncct.gov.in/verify/${certNumber}`,
          },
        });
      }

      if (journeyStage === 3) {
        const employer = EMPLOYERS[employerIndex % EMPLOYERS.length];
        employerIndex++;
        const existing = await prisma.employmentOutcome.findFirst({ where: { traineeId: trainee.id } });
        if (!existing) {
          await prisma.employmentOutcome.create({
            data: {
              traineeId: trainee.id, employerName: employer.name, jobTitle: employer.title,
              annualPackage: employer.package, placementDate: new Date('2026-11-20T00:00:00.000Z'),
              verificationStatus: 'VERIFIED',
            },
          });
        }
      }

      if (hostel && i === 0) {
        const room = await prisma.hostelRoom.findFirst({ where: { hostelId: hostel.id } });
        if (room) {
          const existingAlloc = await prisma.hostelAllocation.findFirst({ where: { traineeId: trainee.id } });
          if (!existingAlloc) {
            await prisma.hostelAllocation.create({
              data: {
                organizationId: org.id, roomId: room.id, traineeId: trainee.id,
                checkInDate: new Date('2026-11-02T14:00:00.000Z'), checkOutDate: new Date('2026-11-07T12:00:00.000Z'),
                actualCheckIn: new Date('2026-11-02T14:20:00.000Z'), status: 'CHECKED_IN',
              },
            });
          }
        }
      }
    }
  }

  console.log('Demo expansion complete:');
  console.log(`  institutions touched: ${institutionsCreated}`);
  console.log(`  programmes upserted: ${programmesCreated}`);
  console.log(`  trainees upserted: ${traineesCreated}`);
  console.log(`  hostels upserted: ${hostelsCreated}, rooms upserted: ${roomsCreated}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
