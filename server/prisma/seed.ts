/**
 * prisma/seed.ts
 * Deterministic, idempotent development seed script for FDR Sentinel.
 * Seeds fictional institutions, demo accounts for each role, and sample instruments.
 *
 * SAFETY RULES:
 * - Refuses to execute in production unless explicitly overridden.
 * - Uses upsert operations to ensure repeatable execution without duplicate records.
 * - Never includes real personal data.
 */

import { PrismaClient, Role, InstrumentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demo@FDR2026!";

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
    console.error("❌ Refusing to run dev seed script in production environment.");
    process.exit(1);
  }

  console.log("🌱 Starting FDR Sentinel deterministic seed...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── 1. Fictional Institutions ───────────────────────────────────────────
  const inst1 = await prisma.institution.upsert({
    where: { code: "INST-DELHI-ENG-001" },
    update: {
      name: "Delhi Institute of Advanced Engineering",
      institutionType: "Engineering & Technology",
      address: "Sector 14, Dwarka, New Delhi, 110078",
    },
    create: {
      code: "INST-DELHI-ENG-001",
      name: "Delhi Institute of Advanced Engineering",
      institutionType: "Engineering & Technology",
      address: "Sector 14, Dwarka, New Delhi, 110078",
    },
  });

  const inst2 = await prisma.institution.upsert({
    where: { code: "INST-MAHA-PHARM-002" },
    update: {
      name: "Maharashtra Institute of Pharmaceutical Sciences",
      institutionType: "Pharmacy",
      address: "Shivaji Nagar, Pune, Maharashtra, 411005",
    },
    create: {
      code: "INST-MAHA-PHARM-002",
      name: "Maharashtra Institute of Pharmaceutical Sciences",
      institutionType: "Pharmacy",
      address: "Shivaji Nagar, Pune, Maharashtra, 411005",
    },
  });

  console.log("✓ Seeded 2 fictional institutions");

  // ── 2. Demo Users for Each Role ─────────────────────────────────────────
  const instUser1 = await prisma.user.upsert({
    where: { email: "inst.delhi@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Dr. Rajesh Verma (Institution Head)",
      role: Role.INSTITUTION_USER,
      institutionId: inst1.id,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "inst.delhi@demo.fdr-sentinel.gov.in",
      fullName: "Dr. Rajesh Verma (Institution Head)",
      role: Role.INSTITUTION_USER,
      institutionId: inst1.id,
      isActive: true,
      passwordHash,
    },
  });

  const instUser2 = await prisma.user.upsert({
    where: { email: "inst.pune@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Prof. Sunita Deshmukh (Registrar)",
      role: Role.INSTITUTION_USER,
      institutionId: inst2.id,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "inst.pune@demo.fdr-sentinel.gov.in",
      fullName: "Prof. Sunita Deshmukh (Registrar)",
      role: Role.INSTITUTION_USER,
      institutionId: inst2.id,
      isActive: true,
      passwordHash,
    },
  });

  const officerUser = await prisma.user.upsert({
    where: { email: "officer.sharma@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Anil Sharma (Scrutiny Officer)",
      role: Role.SCRUTINY_OFFICER,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "officer.sharma@demo.fdr-sentinel.gov.in",
      fullName: "Anil Sharma (Scrutiny Officer)",
      role: Role.SCRUTINY_OFFICER,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
  });

  const approverUser = await prisma.user.upsert({
    where: { email: "approver.verma@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Dr. Sanjay Verma (Regulatory Approver)",
      role: Role.APPROVER,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "approver.verma@demo.fdr-sentinel.gov.in",
      fullName: "Dr. Sanjay Verma (Regulatory Approver)",
      role: Role.APPROVER,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin.sentinel@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Pooja Kulkarni (System Administrator)",
      role: Role.ADMIN,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "admin.sentinel@demo.fdr-sentinel.gov.in",
      fullName: "Pooja Kulkarni (System Administrator)",
      role: Role.ADMIN,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
  });

  const auditorUser = await prisma.user.upsert({
    where: { email: "auditor.patel@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Kavita Patel (Compliance Auditor)",
      role: Role.AUDITOR,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "auditor.patel@demo.fdr-sentinel.gov.in",
      fullName: "Kavita Patel (Compliance Auditor)",
      role: Role.AUDITOR,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "auditor.sen@demo.fdr-sentinel.gov.in" },
    update: {
      fullName: "Meera Sen (Compliance Auditor)",
      role: Role.AUDITOR,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
    create: {
      email: "auditor.sen@demo.fdr-sentinel.gov.in",
      fullName: "Meera Sen (Compliance Auditor)",
      role: Role.AUDITOR,
      institutionId: null,
      isActive: true,
      passwordHash,
    },
  });

  console.log("✓ Seeded 6 demo accounts (INSTITUTION_USER x2, SCRUTINY_OFFICER, APPROVER, ADMIN, AUDITOR)");

  // ── 3. Synthetic Instruments ────────────────────────────────────────────
  // Institution 1 instruments
  await prisma.instrument.upsert({
    where: {
      institutionId_instrumentNumber: {
        institutionId: inst1.id,
        instrumentNumber: "FDR-SBI-2026-901",
      },
    },
    update: {
      bankName: "State Bank of India",
      branchName: "Dwarka Sector 14 Branch",
      amount: 500000.0,
      issueDate: new Date("2025-04-01T00:00:00.000Z"),
      maturityDate: new Date("2030-04-01T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.ACTIVE,
      createdById: instUser1.id,
    },
    create: {
      instrumentNumber: "FDR-SBI-2026-901",
      bankName: "State Bank of India",
      branchName: "Dwarka Sector 14 Branch",
      amount: 500000.0,
      issueDate: new Date("2025-04-01T00:00:00.000Z"),
      maturityDate: new Date("2030-04-01T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.ACTIVE,
      institutionId: inst1.id,
      createdById: instUser1.id,
    },
  });

  await prisma.instrument.upsert({
    where: {
      institutionId_instrumentNumber: {
        institutionId: inst1.id,
        instrumentNumber: "FDR-PNB-2026-902",
      },
    },
    update: {
      bankName: "Punjab National Bank",
      branchName: "Connaught Place Branch",
      amount: 350000.0,
      issueDate: new Date("2026-01-15T00:00:00.000Z"),
      maturityDate: new Date("2031-01-15T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.UNDER_SCRUTINY,
      createdById: instUser1.id,
    },
    create: {
      instrumentNumber: "FDR-PNB-2026-902",
      bankName: "Punjab National Bank",
      branchName: "Connaught Place Branch",
      amount: 350000.0,
      issueDate: new Date("2026-01-15T00:00:00.000Z"),
      maturityDate: new Date("2031-01-15T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.UNDER_SCRUTINY,
      institutionId: inst1.id,
      createdById: instUser1.id,
    },
  });

  // Institution 2 instrument
  await prisma.instrument.upsert({
    where: {
      institutionId_instrumentNumber: {
        institutionId: inst2.id,
        instrumentNumber: "FDR-BOB-2026-801",
      },
    },
    update: {
      bankName: "Bank of Baroda",
      branchName: "Shivaji Nagar Pune Branch",
      amount: 450000.0,
      issueDate: new Date("2025-08-10T00:00:00.000Z"),
      maturityDate: new Date("2030-08-10T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.ACTIVE,
      createdById: instUser2.id,
    },
    create: {
      instrumentNumber: "FDR-BOB-2026-801",
      bankName: "Bank of Baroda",
      branchName: "Shivaji Nagar Pune Branch",
      amount: 450000.0,
      issueDate: new Date("2025-08-10T00:00:00.000Z"),
      maturityDate: new Date("2030-08-10T00:00:00.000Z"),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status: InstrumentStatus.ACTIVE,
      institutionId: inst2.id,
      createdById: instUser2.id,
    },
  });

  console.log("✓ Seeded 3 synthetic instruments across institutions");

  // ── 4. Audit Event ──────────────────────────────────────────────────────
  await prisma.auditEvent.create({
    data: {
      actorId: adminUser.id,
      action: "DEVELOPMENT_SEED_EXECUTED",
      entityType: "SYSTEM",
      entityId: "DEV_ENV",
      metadata: {
        seededInstitutions: 2,
        seededUsers: 4,
        seededInstruments: 3,
        timestamp: new Date().toISOString(),
      },
    },
  });

  console.log("✓ Recorded seed execution audit event");
  console.log("\n=======================================================");
  console.log("DEMO ACCOUNTS READY (Development Only):");
  console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
  console.log("-------------------------------------------------------");
  console.log("1. Institution User 1 (Delhi):");
  console.log("   Email: inst.delhi@demo.fdr-sentinel.gov.in");
  console.log("2. Institution User 2 (Pune):");
  console.log("   Email: inst.pune@demo.fdr-sentinel.gov.in");
  console.log("3. Scrutiny Officer:");
  console.log("   Email: officer.sharma@demo.fdr-sentinel.gov.in");
  console.log("4. Regulatory Approver:");
  console.log("   Email: approver.verma@demo.fdr-sentinel.gov.in");
  console.log("5. System Administrator:");
  console.log("   Email: admin.sentinel@demo.fdr-sentinel.gov.in");
  console.log("6. Compliance Auditor:");
  console.log("   Email: auditor.sen@demo.fdr-sentinel.gov.in");
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
