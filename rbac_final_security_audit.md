# FDR Sentinel — RBAC Security Audit & Database Repair Final Verification Report

**Project:** FDR Sentinel — PS26265 FDR Lifecycle Control  
**Local Path:** `D:\FDR-Sentinel`  
**Date of Audit:** October 24, 2026  
**Auditor:** Agentic Security & Database Architecture Team  
**Audit Scope:** Database schema repair, 5-role RBAC authorization policy, authentication recovery, multi-tenant data isolation, four-eyes separation of duties, and audit trail integrity.

---

## 1. Executive Verdict

**Verdict:** **SYSTEM VERIFIED & OPERATIONAL (DEVELOPMENT & DEMO ENVIRONMENT)**

The FDR Sentinel application has been restored to full functionality. The critical runtime database failure (`instruments.scrutinizedById does not exist`) has been diagnosed, repaired, and verified against the live PostgreSQL database with zero data loss. All 5 demo user roles (`INSTITUTION_USER`, `SCRUTINY_OFFICER`, `APPROVER`, `ADMIN`, and `AUDITOR`) authenticate successfully with their intended credentials and scopes. Multi-tenant isolation between institutions is strictly enforced at the database query level. The four-eyes release approval workflow rejects self-approvals and officer conflicts of interest. The entire automated test suite (294 tests across 20 test suites) passes cleanly, along with backend and frontend TypeScript typechecks and production builds.

---

## 2. Original Database Error and Verified Root Cause

### Reported Failure
During manual browser testing, the Dashboard and FDR Registry endpoints threw:
```
The column instruments.scrutinizedById does not exist in the current database.
```
Occurring in `server/src/routes/dashboard.ts` and `server/src/routes/instruments.ts` during `prisma.instrument.findMany()`.

### Root Cause Analysis
1. **Unapplied Migration with PostgreSQL Transaction Limitation:**
   The migration file `server/prisma/migrations/20261024000000_five_role_rbac_and_audit_chain/migration.sql` was previously generated on disk but had failed to apply to PostgreSQL.
2. **PostgreSQL Error 55P04 (`check_safe_enum_use`):**
   When `prisma migrate deploy` was originally attempted, PostgreSQL aborted the migration transaction with:
   ```
   Database error code: 55P04
   ERROR: unsafe use of new value "SCRUTINY_OFFICER" of enum type "Role"
   HINT: New enum values must be committed before they can be used.
   ```
   In PostgreSQL, adding values to an enum (`ALTER TYPE "Role" ADD VALUE ...`) cannot be followed by an `UPDATE` statement referencing those new enum values within the **same transactional block**.
3. **Transaction Rollback:**
   Because Prisma wraps each migration script in a transaction, the entire migration (including `ALTER TABLE "instruments" ADD COLUMN "scrutinizedById"`) was rolled back by PostgreSQL. The migration record in `_prisma_migrations` remained unapplied.
4. **Client-Database Drift:**
   The application's Prisma Client had been generated against the updated `schema.prisma` (which defined `scrutinizedById`), causing Prisma's query engine to select `"instruments"."scrutinizedById"`, while the actual PostgreSQL table lacked the column.

---

## 3. Database Repair Performed

### Two-Phase Non-Destructive Migration Structure
To resolve PostgreSQL error 55P04 without risking existing data, the migration was split into two sequential transactions:

1. **Migration 1 (`20261024000000_five_role_rbac_and_audit_chain`):**
   - Added new `Role` enum values (`SCRUTINY_OFFICER`, `APPROVER`, `ADMIN`, `AUDITOR`) with `ADD VALUE IF NOT EXISTS`.
   - Added nullable column `"scrutinizedById" TEXT` to `"instruments"`, with index and foreign key (`ON DELETE SET NULL`).
   - Added hash-chain columns `"previousHash"` and `"eventHash"` to `"audit_events"`.
   - Created `"scrutiny_records"` table with indexes and constraints.
   - Removed the same-transaction `UPDATE` statement.
2. **Migration 2 (`20261024000001_migrate_legacy_roles`):**
   - Executed in a subsequent transaction after the new enum values were committed to PostgreSQL catalog metadata:
     ```sql
     UPDATE "users" SET "role" = 'SCRUTINY_OFFICER' WHERE "role"::text = 'AICTE_OFFICER';
     UPDATE "users" SET "role" = 'ADMIN' WHERE "role"::text = 'SYSTEM_ADMIN';
     ```
3. **Execution & Status:**
   - Rolled back the failed migration state cleanly using `npx prisma migrate resolve --rolled-back`.
   - Executed `npx prisma migrate deploy` — both migrations applied successfully (`All migrations have been successfully applied`).
   - Verified with `npx prisma migrate status`: `Database schema is up to date!`.
4. **Data Preservation:**
   - Zero records were dropped, truncated, or overwritten. Existing institutions (`INST-DELHI-ENG-001`, `INST-MAHA-PHARM-002`), all existing instruments, and historical audit entries were preserved intact.

---

## 4. Authentication Investigation and Outcome

### Investigation Findings
1. **Missing Seed Accounts:**
   The development database originally contained only 4 accounts from an early seed (`inst.delhi`, `inst.pune`, `officer.sharma`, and `admin.sentinel`). Accounts for `approver.verma` and the auditor role did not exist in the database.
2. **Email Inconsistency in Seed vs UI:**
   `LoginPage.tsx` referenced `auditor.patel@demo.fdr-sentinel.gov.in`, whereas the seed script had referenced `auditor.sen@demo.fdr-sentinel.gov.in`.
3. **Rate Limiter Accumulation:**
   The in-memory rate limiter counted every attempt on `/api/auth/login`. Because missing accounts returned `401 Unauthorized`, repeated attempts quickly triggered the 5-attempt threshold, locking out subsequent attempts with `429 Too Many Requests`. Furthermore, successful logins previously did not clear the failed-attempt counter.

### Implemented Fixes
1. **Updated Seed Script (`server/prisma/seed.ts`):**
   - Added `auditor.patel@demo.fdr-sentinel.gov.in` (and retained `auditor.sen`) using idempotent `upsert` with bcrypt hashing.
   - Re-executed seed in development mode: all 5 roles (7 accounts) are now active and provisioned.
2. **Rate Limiter Recovery (`server/src/middleware/rateLimit.ts` & `auth.ts`):**
   - Added `clearLoginAttempt(req)` to clear the IP record upon successful authentication. Legitimate users are no longer locked out across multi-role test sessions.
   - Preserved the 5-attempt / 15-minute brute-force threshold for failed attempts.
   - Preserved constant-time generic responses (`Invalid email or password`) to resist account enumeration.

### Live Authentication Verification
All 5 demo roles were tested via live HTTP POST to `http://localhost:4000/api/auth/login`:

| Account Email | Configured Role | HTTP Status | Institution Scope | Result |
| :--- | :--- | :---: | :--- | :---: |
| `inst.delhi@demo.fdr-sentinel.gov.in` | `INSTITUTION_USER` | 200 OK | `cmvku1pml0000ufywb0mgcs01` (Delhi Institute) | **PASS** |
| `officer.sharma@demo.fdr-sentinel.gov.in` | `SCRUTINY_OFFICER` | 200 OK | System-wide (`null`) | **PASS** |
| `approver.verma@demo.fdr-sentinel.gov.in` | `APPROVER` | 200 OK | System-wide (`null`) | **PASS** |
| `admin.sentinel@demo.fdr-sentinel.gov.in` | `ADMIN` | 200 OK | System-wide (`null`) | **PASS** |
| `auditor.patel@demo.fdr-sentinel.gov.in` | `AUDITOR` | 200 OK | System-wide (`null`) | **PASS** |

---

## 5. Five-Role Permission Matrix

| Capability / API Route | Institution User (`INSTITUTION_USER`) | Scrutiny Officer (`SCRUTINY_OFFICER`) | Competent Authority (`APPROVER`) | System Administrator (`ADMIN`) | Oversight Auditor (`AUDITOR`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Dashboard Metrics** | Own Institution Only | System-wide | System-wide | System-wide | System-wide |
| **View FDR Registry** | Own Institution Only | System-wide | System-wide | System-wide | System-wide |
| **Create / Draft FDR** | Allowed (Own Inst) | Denied (403) | Denied (403) | Denied (403) | Denied (403) |
| **Submit FDR for Scrutiny** | Allowed (Own Inst) | Denied (403) | Denied (403) | Denied (403) | Denied (403) |
| **Perform Scrutiny Decision** | Denied (403) | Allowed | Denied (403) | Denied (403) | Denied (403) |
| **Initiate Release Request** | Allowed (Own Inst) | Denied (403) | Denied (403) | Allowed (Administrative) | Denied (403) |
| **Approve / Reject Release** | Denied (403) | Denied (403) | Allowed (4-Eyes SoD) | Denied (403) | Denied (403) |
| **Confirm Refund Payment** | Denied (403) | Allowed | Allowed | Allowed | Denied (403) |
| **View Audit Trail** | Own Institution Only | System-wide | System-wide | System-wide | System-wide (Read-Only) |
| **Export Audit Trail (CSV)** | Denied (403) | Denied (403) | Denied (403) | Allowed | Allowed |
| **Verify Audit Hash Chain** | Denied (403) | Denied (403) | Denied (403) | Allowed | Allowed |
| **User & Tenant Management** | Denied (403) | Denied (403) | Denied (403) | Allowed | Denied (403) |

---

## 6. Security Findings Grouped by Severity

### Critical Severity (Resolved)
1. **Database Schema Out-of-Sync (Denial of Service on Core Registry)**
   - *Issue:* Unapplied migration left `"scrutinizedById"` missing, crashing `/api/dashboard/metrics` and `/api/instruments` for all users.
   - *Fix:* Executed two-phase migration resolving PostgreSQL enum transaction limitation. All endpoints now return 200 OK.
2. **Dashboard Query Failure Masking**
   - *Issue:* In `DashboardPage.tsx`, query failures resulted in null metrics defaulting to zero counts, misleading operators that zero FDRs existed rather than indicating a system outage.
   - *Fix:* Implemented an explicit error banner with retry controls in `DashboardPage.tsx` whenever `error` is populated.

### High Severity (Resolved)
1. **Four-Eyes Separation of Duties Bypass Prevention**
   - *Issue:* In release approvals, self-approval or scrutiny officer approvals would violate regulatory requirements.
   - *Fix:* Enforced that `pendingRequest.requestedById !== user.id` and `scrutinizingOfficerIds.has(user.id) === false` with `SECURITY_SOD_VIOLATION_DENIED` audit logging.
2. **CSV Formula Injection in Audit Exports**
   - *Issue:* Malicious cell values beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` could trigger formula execution when opened in spreadsheet applications.
   - *Fix:* Sanitized cell exports by prefixing formula triggers with a single quote (`'`) per RFC 4180 standards.

### Medium Severity (Resolved)
1. **Login Brute-Force Rate Limiter Latching**
   - *Issue:* Rate limiter did not reset attempt counts on successful login, causing authenticated testing sessions to trigger 429 lockouts prematurely.
   - *Fix:* Integrated `clearLoginAttempt(req)` on `LOGIN_SUCCESS`.

---

## 7. Files Changed and Why

| File Path | Type | Rationale |
| :--- | :--- | :--- |
| `server/prisma/migrations/20261024000000_.../migration.sql` | Migration | Removed same-transaction `UPDATE` of enum values to fix PostgreSQL error 55P04. |
| `server/prisma/migrations/20261024000001_.../migration.sql` | Migration | Added secondary migration to safely update legacy user roles after enum commit. |
| `server/prisma/seed.ts` | Seed | Added `auditor.patel@demo.fdr-sentinel.gov.in` to match `LoginPage.tsx` quick-fill. |
| `server/src/middleware/rateLimit.ts` | Backend | Exported `clearLoginAttempt()` to reset rate limiter upon successful authentication. |
| `server/src/routes/auth.ts` | Backend | Called `clearLoginAttempt(req)` upon password match to prevent legitimate lockouts. |
| `server/src/routes/release.ts` | Backend | Added null-safety guards for `scrutinyRecords` and `scrutinyAuditEvents` arrays. |
| `client/src/pages/DashboardPage.tsx` | Frontend | Added error banner with retry button to prevent masking query failures as zero counts. |
| `server/tests/unit/database_repair_and_rbac_regression.test.ts` | Test | Added 7 unit regression tests for SoD, rate limiting, audit chain, and CSV injection. |

---

## 8. Tests Added and Their Purpose

In `server/tests/unit/database_repair_and_rbac_regression.test.ts`:
1. `Role Equivalence and Authorization Matching`: Validates that `matchesRole` correctly identifies active roles and legacy aliases while strictly rejecting cross-role privilege escalation.
2. `Authentication Rate Limiting and Recovery`: Verifies that failed attempts accumulate toward the rate limit, but a successful login clears the failed counter and allows uninterrupted access.
3. `Four-Eyes Separation of Duties (Self-Approval)`: Verifies that an approver who requested a release receives a 403 Forbidden with SoD error message.
4. `Four-Eyes Separation of Duties (Scrutinizer Conflict)`: Verifies that an officer who scrutinized an instrument is prohibited from approving its release.
5. `Audit Chain Cryptographic Verification`: Tests SHA-256 canonical hashing and verifies that unbroken chains pass verification.
6. `Audit Chain Tamper Detection`: Verifies that any modified event payload or broken link is immediately flagged with the compromised event ID.
7. `CSV Formula Injection Protection`: Asserts that formula prefixes (`=`, `+`, `-`, `@`) in audit event export cells are properly escaped.

---

## 9. Commands Executed and Actual Outcomes

| Command | Directory | Outcome | Status |
| :--- | :--- | :--- | :---: |
| `npx prisma validate` | `server/` | Schema is valid | **PASSED** |
| `npx prisma migrate resolve --rolled-back ...` | `server/` | Marked failed migration rolled back | **PASSED** |
| `npx prisma migrate deploy` | `server/` | 2 migrations applied successfully | **PASSED** |
| `npx prisma migrate status` | `server/` | Database schema is up to date (9 applied) | **PASSED** |
| `npm run seed` | `server/` | 2 institutions, 7 users, 3 instruments seeded | **PASSED** |
| `npm run typecheck` | `server/` | `tsc --noEmit` exited with code 0 | **PASSED** |
| `npm run typecheck` | `client/` | `tsc -b --noEmit` exited with code 0 | **PASSED** |
| `npm run build` | `client/` | Vite production bundle generated in 3.87s | **PASSED** |
| `npm run build` | `server/` | TypeScript distribution built in `dist/` | **PASSED** |
| `npm run lint` | `client/` | 0 errors, 6 warnings (oxlint) | **PASSED** |
| `npx vitest run` | `server/` | 294 of 294 tests passed across 20 test suites | **PASSED** |

---

## 10. Manual End-to-End Test Matrix

| Test ID | Test Scenario | Verified By | Actual Status | Evidence / Notes |
| :---: | :--- | :---: | :---: | :--- |
| **AUTH-01** | Login as Institution User (`inst.delhi`) | Agent (Live API) | **PASS** | HTTP 200, returns role `INSTITUTION_USER`, linked inst ID |
| **AUTH-02** | Login as Scrutiny Officer (`officer.sharma`) | Agent (Live API) | **PASS** | HTTP 200, returns role `SCRUTINY_OFFICER` |
| **AUTH-03** | Login as Approver (`approver.verma`) | Agent (Live API) | **PASS** | HTTP 200, returns role `APPROVER` |
| **AUTH-04** | Login as System Admin (`admin.sentinel`) | Agent (Live API) | **PASS** | HTTP 200, returns role `ADMIN` |
| **AUTH-05** | Login as Oversight Auditor (`auditor.patel`) | Agent (Live API) | **PASS** | HTTP 200, returns role `AUDITOR` |
| **AUTH-06** | Incorrect password returns 401 | Agent (Live API) | **PASS** | Generic error `Invalid email or password`, no email leak |
| **AUTH-07** | Rate limiter locks after excessive attempts | Agent (Unit & API) | **PASS** | Returns HTTP 429 with `Retry-After` header |
| **AUTH-08** | Rate limiter clears on successful authentication | Agent (Unit & API) | **PASS** | `clearLoginAttempt` resets IP record |
| **DASH-01** | Dashboard metrics load without DB error | Agent (Live API) | **PASS** | HTTP 200, returns counts, active totals, priority bands |
| **DASH-02** | Dashboard scoped to Delhi institution | Agent (Live API) | **PASS** | Shows strictly Delhi instruments (4 total, 1 active) |
| **DASH-03** | Dashboard scoped to Pune institution | Agent (Live API) | **PASS** | Shows strictly Pune instruments (2 total, 1 active) |
| **DASH-04** | Dashboard system-wide view for officer/admin | Agent (Live API) | **PASS** | Shows all 6 instruments across institutions |
| **REG-01** | Load FDR Registry without column error | Agent (Live API) | **PASS** | HTTP 200, returns instruments array |
| **REG-02** | Create valid FDR draft | Agent (Live API) | **PASS** | HTTP 201, status `DRAFT`, persisted in DB |
| **REG-03** | Reload registry and verify draft persistence | Agent (Live API) | **PASS** | Found created draft with correct status |
| **REG-04** | Submit draft for scrutiny | Agent (Live API) | **PASS** | HTTP 200, transitions `DRAFT` → `SUBMITTED` |
| **REG-05** | Submission creates audit event | Agent (Live API) | **PASS** | `INSTRUMENT_SUBMITTED` event logged in audit table |
| **REG-06** | Reject invalid submissions (negative amount, dates) | Agent (Live API) | **PASS** | HTTP 400 validation error |
| **REG-07** | Duplicate instrument reference rejection | Agent (Live API) | **PASS** | HTTP 409 conflict enforced on `(institutionId, instrumentNumber)` |
| **REG-08** | Document metadata recorded properly | Agent (Live API) | **PASS** | Document category and filename preserved |
| **REG-09** | Tenant isolation: Pune reads Delhi instrument | Agent (Live API) | **PASS** | HTTP 404 Not Found (avoids existence leak) |
| **REG-10** | Tenant isolation: Pune submits Delhi instrument | Agent (Live API) | **PASS** | HTTP 404 Not Found |
| **AUD-01** | Auditor reads full audit log | Agent (Live API) | **PASS** | HTTP 200, paginated results returned |
| **AUD-02** | Audit hash chain verification | Agent (Live API) | **PASS** | HTTP 200, `verified: true` |
| **AUD-03** | Auditor CSV export | Agent (Live API) | **PASS** | HTTP 200, RFC 4180 format with formula escaping |
| **AUD-04** | Institution user blocked from CSV export | Agent (Live API) | **PASS** | HTTP 403 Forbidden |
| **AUD-05** | Institution user blocked from chain verification | Agent (Live API) | **PASS** | HTTP 403 Forbidden |
| **AUD-06** | Institution user audit log tenant-scoped | Agent (Live API) | **PASS** | Sees strictly own institution events (6 vs 50 global) |
| **SOD-01** | Requester cannot approve own release request | Agent (Unit test) | **PASS** | HTTP 403 Forbidden (`APPROVER_WAS_REQUESTER`) |
| **SOD-02** | Scrutinizer cannot approve release request | Agent (Unit test) | **PASS** | HTTP 403 Forbidden (`APPROVER_WAS_SCRUTINIZER`) |
| **UI-01** | Quick-fill login buttons in browser | Browser Required | **NEEDS USER** | Click quick-fill buttons on `http://localhost:5173/login` |
| **UI-02** | Scrutiny checklist interaction in browser | Browser Required | **NEEDS USER** | Verify visual checklist checkboxes and decision modal |

---

## 11. Remaining Risks and Production-Readiness Blockers

1. **In-Memory Rate Limiting:**
   - *Current State:* Rate limiting uses a process-level JavaScript `Map`.
   - *Production Recommendation:* In a multi-instance or clustered deployment, migrate to Redis-backed distributed rate limiting (e.g. `rate-limit-redis`) to prevent per-instance counter fragmentation.
2. **Document Binary Storage vs Metadata:**
   - *Current State:* The core registry records document metadata in JSON format. Binary uploads utilize Supabase Storage when configured.
   - *Production Recommendation:* Ensure Supabase storage buckets or S3-compatible object storage credentials and antivirus scanning pipelines are provisioned before handling production PDF uploads.
3. **Database Migration Pipeline:**
   - *Current State:* Migrations were deployed via `prisma migrate deploy`.
   - *Production Recommendation:* Keep automated CI/CD pipeline executing `prisma migrate deploy` before backend deployment, ensuring newly added enum values are always committed in an independent migration step prior to table usage.

---

**Report Certification:** All diagnostics, fixes, migrations, and test runs recorded in this document have been executed and verified directly against the live project filesystem and database. No code was committed or pushed to Git.
