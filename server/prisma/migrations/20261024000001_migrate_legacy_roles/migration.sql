-- Migration: 20261024000001_migrate_legacy_roles
-- Purpose: Safely migrate legacy roles to new 5-role RBAC schema after enum values committed

UPDATE "users" SET "role" = 'SCRUTINY_OFFICER' WHERE "role"::text = 'AICTE_OFFICER';
UPDATE "users" SET "role" = 'ADMIN' WHERE "role"::text = 'SYSTEM_ADMIN';
