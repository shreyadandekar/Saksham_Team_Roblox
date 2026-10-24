-- Migration: 20261024000000_five_role_rbac_and_audit_chain
-- Purpose: Implement 5-role RBAC architecture, scrutiny history tracking, and audit-chain integrity fields

-- 1. Extend Role Enum with the 4 new roles (non-destructive)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SCRUTINY_OFFICER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'APPROVER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUDITOR';

-- 2. Add Scrutiny Tracking to Instruments for Four-Eyes Separation of Duties
ALTER TABLE "instruments" ADD COLUMN IF NOT EXISTS "scrutinizedById" TEXT;
CREATE INDEX IF NOT EXISTS "instruments_scrutinizedById_idx" ON "instruments"("scrutinizedById");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instruments_scrutinizedById_fkey'
  ) THEN
    ALTER TABLE "instruments" ADD CONSTRAINT "instruments_scrutinizedById_fkey"
      FOREIGN KEY ("scrutinizedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Add Tamper-Evident Hash Chain Fields to Audit Events
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "previousHash" TEXT;
ALTER TABLE "audit_events" ADD COLUMN IF NOT EXISTS "eventHash" TEXT;
CREATE INDEX IF NOT EXISTS "audit_events_previousHash_idx" ON "audit_events"("previousHash");

-- 4. Create Scrutiny Records Table for Structured Scrutiny History
CREATE TABLE IF NOT EXISTS "scrutiny_records" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'INITIAL',
    "decision" TEXT NOT NULL,
    "remarks" TEXT,
    "checklistData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrutiny_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "scrutiny_records_instrumentId_idx" ON "scrutiny_records"("instrumentId");
CREATE INDEX IF NOT EXISTS "scrutiny_records_officerId_idx" ON "scrutiny_records"("officerId");
CREATE INDEX IF NOT EXISTS "scrutiny_records_createdAt_idx" ON "scrutiny_records"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scrutiny_records_instrumentId_fkey'
  ) THEN
    ALTER TABLE "scrutiny_records" ADD CONSTRAINT "scrutiny_records_instrumentId_fkey"
      FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scrutiny_records_officerId_fkey'
  ) THEN
    ALTER TABLE "scrutiny_records" ADD CONSTRAINT "scrutiny_records_officerId_fkey"
      FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

