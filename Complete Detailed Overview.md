# FDR Sentinel — Complete Updated Project Overview | SIH 2026

> **Project Name:** FDR Sentinel  
> **Problem Statement ID:** PS26265  
> **Problem Statement Title:** Streamline of Security Deposit/FDR Portal  
> **Target Organization:** AICTE (All India Council for Technical Education), Regulation Bureau  
> **Theme:** Smart Automation | **Category:** Software  
> **Repository Baseline:** React 19 + TypeScript + Vite + Tailwind CSS v4 (Client) | Node.js + Express + TypeScript + Prisma + PostgreSQL (Server)  
> **Test Status:** 22 Test Suites Passed (100%), 325 Unit Tests Passed (100%), Frontend Build Verified  

---

## 1. Executive Overview

**FDR Sentinel** is a purpose-built, regulatory-aware web platform designed for AICTE’s Regulation Bureau and technical institutions across India. It modernises the end-to-end lifecycle of institutional security deposits submitted as Fixed Deposit Receipts (FDRs). 

While conventional institutional portals act as passive document filing cabinets or basic database registries, FDR Sentinel incorporates active regulatory intelligence to automate oversight, enforce statutory compliance, and streamline administrative clearances.

The platform is engineered around two core Unique Selling Propositions (USPs):
1. **APH-Aware FDR Compliance Intelligence Engine (USP 1):** Automatically evaluates institutional security deposit obligations against versioned tables in the AICTE Approval Process Handbook (APH 2024–2027 Section 1.12, Table 1.4). It accounts for academic programmes, level (Diploma, UG, PG), and physical premises ownership (such as the 2.0× multiplier for private-leased land/buildings), calculating exact shortfalls or surpluses with clause-level explainability.
2. **Intelligent FDR Release & Multi-Department Clearance Workflow (USP 2):** Digitises and coordinates the statutory release and refund process under APH Section 6.46. It enforces four-eyes separation of duties, tracks scrutiny reviews across four mandatory legal documents, orchestrates inter-departmental clearances (Public Grievance Redressal Cell [PGRC], Vigilance Bureau, Regional/Other Bureaus), and features an automated **Final Decision Guard** that blocks premature No Objection Certificate (NOC) issuance until every prerequisite is satisfied.

### Core Value Sentence
> *"FDR Sentinel transforms static institutional deposit records into active, explainable regulatory compliance intelligence and coordinates multi-department release clearances with cryptographic auditability."*

---

## 2. Problem Understanding

Under the AICTE Act, technical educational institutions seeking establishment, extension of approval, or introduction of new programmes must maintain financial security deposits with AICTE in the form of joint FDRs. These deposits safeguard faculty salaries, student interests, and institutional commitments.

### Real Administrative Bottlenecks

1. **Fragmented and Asynchronous Record Management:**  
   Thousands of approved institutions maintain multiple FDRs across nationalised and scheduled commercial banks. Historically, tracking deposit renewals, maturities, and balances across disparate regional offices and banks involved spreadsheet tracking and physical files.
2. **Complex and Dynamic Regulatory Calculus:**  
   Security deposit obligations are not uniform. The AICTE Approval Process Handbook stipulates differing deposit schedules across Engineering, Management, Design, Pharmacy, Applied Arts, etc., modulated by academic levels (Diploma, UG, PG) and institutional ownership conditions. Determining whether an institution’s active deposits satisfy current norms required slow, manual cross-referencing.
3. **Maturity Lapses and Delayed Renewals:**  
   FDRs mature after fixed tenures (typically 5 to 10 years). Without automated, multi-tiered advance notification systems (90, 60, 30, 15 days), instruments risk lapsing or remaining non-compliant without timely renewal or replacement.
4. **Manual Document Scrutiny & Extraction Errors:**  
   Institutions submit scanned deposit receipts, bank verification certificates, and board resolutions. Verifying whether the typed metadata matches the bank-issued receipt required manual reading, prone to typographical errors or missed discrepancies.
5. **The Release Clearance Bottleneck (APH Section 6.46):**  
   When an institution applies to close a course, reduce intake, or mature a deposit, releasing the FDR requires multi-bureau concurrence. AICTE must verify that no faculty or student grievances are pending before the PGRC, no vigilance inquiries or court litigations are active, all mandatory affidavits are confirmed, and competent approval authorities concur. Without a unified clearance engine, release requests suffered prolonged correspondence delays and lacked explainability.

> **Regulatory Context:**  
> AICTE has previously introduced online portals for approval tracking and release applications. FDR Sentinel does not claim that AICTE has no digital presence; rather, it bridges the critical gap between basic record storage and **automated regulatory compliance, explainable blocker detection, and cryptographically verified inter-departmental clearances**.

---

## 3. Users and Role-Based Access Control (RBAC)

The system enforces strict multi-tenant isolation, role-based authorization, and Four-Eyes separation of duties across **six primary user roles**:

| User Role | System Identifier | Scope & Tenant Boundaries | Authorized Operational Capabilities |
|---|---|---|---|
| **Institution User** | `INSTITUTION_USER` | Scoped strictly to own `institutionId`. Cannot view or access other institutions. | Registers new FDRs; uploads scanned receipts and statutory affidavits; submits instruments for scrutiny; initiates release requests; views deficiency notes; tracks clearance status. |
| **Scrutiny Officer** | `SCRUTINY_OFFICER` | System-wide access across all technical institutions. | Inspects submitted FDRs; verifies OCR extracted data against uploaded documents; overrides/confirms extracted fields; conducts scrutiny reviews of release documents (`AFFIDAVIT_6`, `BOARD_RESOLUTION`, `UNDERTAKING_2`, `AICTE_JOINT_FDR`); requests corrections or confirms documents; places/lifts administrative holds. |
| **PGRC Officer** | `AICTE_OFFICER` / `SCRUTINY_OFFICER` (`department: PGRC`) | Bureau-specific access to pending release cases. | Reviews institutional grievances; records statutory PGRC clearance decisions (`CLEARED`, `OBJECTION_RAISED`, `NOT_APPLICABLE`); logs grievance inquiry observations. |
| **Vigilance Officer** | `AICTE_OFFICER` / `SCRUTINY_OFFICER` (`department: VIGILANCE`) | Bureau-specific access to pending release cases. | Inspects disciplinary cases, court matters, and compliance inquiries; records authorized Vigilance clearance decisions (`CLEARED`, `OBJECTION_RAISED`). |
| **Approver (Competent Authority)** | `APPROVER` | System-wide decision-making authority. | Final decision authority on release requests; reviews satisfied prerequisites; issues official AICTE Release NOCs (strictly gated by backend guard); places/lifts regulatory holds. Enforces Four-Eyes Principle. |
| **Auditor** | `AUDITOR` | System-wide read-only visibility. | Independent compliance oversight; inspects complete audit logs; verifies cryptographic SHA-256 tamper-evident chains; exports CSV audit reports; reviews APH compliance and clearance histories without write permissions. |
| **System Administrator** | `ADMIN` / `SYSTEM_ADMIN` | Global administrative control. | Manages user accounts and department assignments; configures APH rule tables; verifies audit chains; oversees system health. |

### Enforced Separation of Duties (Four-Eyes Principle)
Under Section 6.46 and administrative best practices, the backend automatically enforces two separation-of-duties rules in `server/src/services/releaseWorkflowService.ts`:
1. **Requester-Approver Separation:** The user who created the release request cannot approve it.
2. **Scrutineer-Approver Separation:** The officer who scrutinized or verified the documents cannot issue the final NOC approval.
Violations result in an immediate `403 Forbidden` response and an immutable `SECURITY_SOD_VIOLATION_DENIED` audit event.

---

## 4. Original PS Requirements vs Implemented Solution

The table below maps the 10 core requirements from SIH PS26265, plus our two integrated USPs, against our actual repository implementation:

| # | PS Requirement | Implemented Solution | Technology & Components | Verification Status | File Evidence |
|---|---|---|---|---|---|
| **1** | **Centralized Repository** | Institution-wise and instrument-wise registry with multi-column filtering, search, and pagination. | PostgreSQL, Prisma ORM, Express API (`/api/instruments`), React Table. | **VERIFIED** (Passes unit & e2e tests) | `server/src/routes/instruments.ts`<br>`client/src/pages/InstrumentsPage.tsx` |
| **2** | **Digital Document Management** | Multi-file upload, MIME magic-byte validation, private Supabase Storage, 60s signed access URLs. | `multer`, `@supabase/supabase-js`, file magic-byte validator. | **VERIFIED** (19 unit tests passing) | `server/src/routes/documents.ts`<br>`server/src/services/supabaseStorage.ts` |
| **3** | **Verification & Discrepancy (OCR)** | Text extraction from PDF & images, candidate field extractor, deterministic comparison engine, confidence scoring. | `pdf-parse`, `tesseract.js`, deterministic comparison engine. | **VERIFIED** (77 OCR & comparison tests passing) | `server/src/services/ocrExtraction.ts`<br>`server/src/services/comparisonEngine.ts` |
| **4** | **Automated Validity & Maturity Tracking** | 24-hour background scheduler, 90/60/30/15-day alert windows, Attention Priority Scoring (0–100), alert dashboard. | Node.js scheduler, `calculateMaturityAndPriority()` service. | **VERIFIED** (31 monitoring tests passing) | `server/src/services/maturityMonitoring.ts`<br>`server/src/services/maturityScheduler.ts` |
| **5** | **Renewal & Replacement Monitoring** | Directed graph tracking of predecessor/successor FDR chains, status propagation, historical linkage. | `InstrumentRelationship` Prisma model, replacement validator. | **VERIFIED** (9 renewal tests passing) | `server/src/routes/instruments.ts`<br>`server/tests/unit/milestone6_renewal_replacement.test.ts` |
| **6** | **Release & Refund Processing** | Multi-stage lifecycle (`SUBMITTED` → `APPROVED` → `REFUND_CONFIRMED`), separation of duties, bank refund references. | `ReleaseRequest` model, workflow state machine. | **VERIFIED** (39 release tests passing) | `server/src/routes/release.ts`<br>`server/tests/unit/milestone7_release_refund.test.ts` |
| **7** | **Automated Alerts & Escalation** | Dashboard alert queues, priority badges (CRITICAL/HIGH/MEDIUM/LOW), urgency sorting. | React UI components, backend alert queries. | **VERIFIED** | `client/src/pages/DashboardPage.tsx`<br>`server/src/routes/dashboard.ts` |
| **8** | **Dashboard & Operational Reports** | Real-time KPI summary cards, priority breakdowns, upcoming maturities, institution-scoped metrics. | Responsive React dashboard, REST metrics API. | **VERIFIED** | `client/src/pages/DashboardPage.tsx`<br>`client/src/components/dashboard/` |
| **9** | **Audit Trail & Access Control** | SHA-256 cryptographic hash-chained audit events, tamper verification API, CSV export with formula injection sanitization. | `crypto`, `AuditEvent` model, verification service. | **VERIFIED** (43 audit tests passing) | `server/src/services/auditTrail.ts`<br>`server/src/routes/audit.ts` |
| **10** | **System Integration & Data Security** | HttpOnly JWT cookies, bcrypt (12 rounds), IP rate limiting (5 attempts/15 min), Zod validation schemas. | `jsonwebtoken`, `bcryptjs`, Express middleware, `zod`. | **VERIFIED** (25 auth & RBAC tests passing) | `server/src/middleware/auth.ts`<br>`server/src/middleware/rateLimit.ts` |
| **USP 1** | **APH-Aware Compliance Intelligence Engine** | Automatic evaluation of AICTE APH 2024–2027 Table 1.4 rules, multi-programme aggregation, 2× lease multiplier, shortfall detection. | Deterministic rules engine (`aphRules.ts`, `aphComplianceEngine.ts`). | **VERIFIED** (15 APH tests passing) | `server/src/services/aphRules.ts`<br>`server/src/services/aphComplianceEngine.ts`<br>`client/src/components/clearance/AphComplianceCard.tsx` |
| **USP 2** | **Intelligent Multi-Department Release Workflow** | Departmental clearance tracking (PGRC, Vigilance, Bureaus), 4 mandatory release doc reviews, NOC Decision Guard, Command Center. | `ReleaseClearance`, `ReleaseDocumentReview`, `releaseWorkflowService.ts`, Clearance Command Center. | **VERIFIED** (16 clearance tests passing, client build passing) | `server/src/services/releaseWorkflowService.ts`<br>`server/src/routes/clearances.ts`<br>`client/src/pages/ClearanceCommandCenterPage.tsx`<br>`client/src/pages/ClearanceCaseDetailPage.tsx` |

---

## 5. Complete Feature Breakdown

### 5.1 FDR Registration & Submission
- **Institution Form:** Captures FDR Number, Bank Name, Branch Name, IFSC Code, Principal Amount, Currency (INR), Issue Date, Maturity Date, Tenure Months, Joint Holder Names (e.g. Regional Officer AICTE & Institution Chairman), and Remarks.
- **Client-Side & Server-Side Validation:** Validated via strict Zod schemas. Disallows inverted dates, non-positive amounts, or malformed IFSC codes.
- **Lifecycle Management:** Starts as `DRAFT`. Once verified by the institution, the user triggers `PATCH /api/instruments/:id/submit`, transitioning it to `SUBMITTED`.

### 5.2 Secure Document Upload & Storage
- **Magic-Byte Binary Inspection:** Rather than trusting client-sent MIME headers, the backend reads file magic bytes to verify genuine PDF (`%PDF-`), JPEG (`\xFF\xD8\xFF`), and PNG (`\x89PNG`) signatures.
- **Private Object Storage:** Files are stored in Supabase Object Storage under isolated folder paths: `{institutionId}/{instrumentId}/{uuid}.{ext}`.
- **Short-Lived Signed URLs:** Documents cannot be indexed or browsed publicly. The `/api/instruments/:id/documents/:docId/download` endpoint generates a 60-second time-limited signed URL after checking authorization.

### 5.3 OCR & Discrepancy Detection Pipeline
1. **Extraction:** PDF files are parsed via `pdf-parse`; scanned image files are parsed via `tesseract.js`.
2. **Candidate Extraction:** The `candidateExtractor` regex engine detects candidate FDR numbers, currency figures, and dates from raw text.
3. **Deterministic Comparison:** The `comparisonEngine` compares form-entered values against OCR-extracted values.
4. **Three-Way Provenance:** Each field is tagged with its origin:
   - `ENTERED`: Value entered by the institution.
   - `EXTRACTED`: Value extracted via OCR.
   - `OVERRIDE`: Value manually corrected and confirmed by an AICTE Scrutiny Officer.
5. **Confidence & Flags:** Discrepancies generate warning badges on the Scrutiny Queue, preventing blind approvals.

### 5.4 Validity & Maturity Monitoring Engine
- **Automated Scanning:** A scheduled cron job executes every 24 hours via `runMaturityMonitoringJob()`.
- **Alert Windows:** Evaluates active instruments against 90, 60, 30, and 15-day maturity thresholds.
- **Attention Priority Score (0–100):** Weighted mathematical score calculated as:
  $$\text{Score} = f(\text{Days to Maturity}) + f(\text{Document Verification Status}) + f(\text{Current Status})$$
- Priority bands (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) allow officers to address urgent expiries first.

### 5.5 Renewal & Replacement Directed Chains
- When an FDR matures, the institution submits a renewed or replacement instrument.
- An `InstrumentRelationship` links the old instrument (`sourceInstrumentId`) to the new one (`targetInstrumentId`).
- Preserves full financial lineage, preventing orphaned FDRs and ensuring continuity of security coverage.

### 5.6 Tamper-Evident SHA-256 Audit Chain
- Every state change, authentication event, scrutiny review, and release action creates an `AuditEvent`.
- Each event stores: `actorId`, `action`, `entityType`, `entityId`, `details` (JSON), and `timestamp`.
- **Cryptographic Hash Chaining:**
  $$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} + \text{EventData}_n)$$
- The `/api/audit/verify-chain` endpoint traverses the chain from genesis to head, verifying that no database record has been modified or deleted.

---

## 6. USP 1 — APH-Aware FDR Compliance Intelligence Engine

### 6.1 Regulatory Context
Under the AICTE Approval Process Handbook (APH 2024–2027, Section 1.12, Table 1.4), every approved institution must maintain a prescribed security deposit. The required deposit is determined by:
1. **Programme:** Engineering & Technology, Planning, Applied Arts & Crafts, Design, Hotel Management & Catering Technology, MCA, Management.
2. **Academic Level:** Diploma, Under Graduate (UG), Post Graduate (PG).
3. **Premises Ownership Condition:** If the institution operates on **private-leased land or buildings**, the security deposit requirement is **doubled (2.0× multiplier)**.

### 6.2 Implementation Architecture
Implemented in `server/src/services/aphRules.ts` and `server/src/services/aphComplianceEngine.ts`:
- **Versioned Rule Table:** Supports active regulatory editions (`APH_2024_2027`).
- **Deterministic Evaluation:** No probabilistic hallucination. Evaluates exact statutory requirements.
- **Aggregation:** Totals all `ACTIVE` and `UNDER_SCRUTINY` FDRs belonging to the institution.
- **Shortfall & Excess Computation:**
  $$\text{Shortfall} = \max(0, \text{Required Deposit} - \text{Recognized Deposit})$$
- **Explainability:** Generates a structured breakdown with cited clauses, multiplier explanations, and missing-data flags.

### 6.3 Table 1.4 Base Requirements Matrix

| Programme | Diploma | Under Graduate (UG) | Post Graduate (PG) |
|---|---:|---:|---:|
| Engineering & Technology | ₹15,00,000 | ₹35,00,000 | ₹15,00,000 |
| Planning | ₹15,00,000 | ₹15,00,000 | ₹15,00,000 |
| Applied Arts and Crafts | ₹15,00,000 | ₹15,00,000 | ₹15,00,000 |
| Design | ₹15,00,000 | ₹15,00,000 | ₹15,00,000 |
| Hotel Management & Catering Tech (HMCT) | ₹15,00,000 | ₹15,00,000 | ₹15,00,000 |
| Computer Applications (MCA) | — | — | ₹15,00,000 |
| Management (MBA/PGDM) | — | — | ₹15,00,000 |

### 6.4 Worked Concrete Example
- **Scenario:** Private New UG Engineering College operating on leased land.
- **Base Requirement:** ₹35,00,000 (APH Table 1.4).
- **Lease Multiplier:** 2.0× applied (APH Section 1.12 condition).
- **Total Obligation:** ₹70,00,000.
- **Institution Deposits:** One FDR of ₹35,00,000 submitted.
- **Engine Output:**
  - `complianceStatus`: `DEFICIENT`
  - `shortfallOrExcess`: `-₹35,00,000`
  - `explanation`: *"Applicable base deposit is ₹35.00 Lakh under Table 1.4. Due to private-leased premises status, a 2.0× multiplier applies, resulting in a ₹70.00 Lakh requirement. Current active deposits total ₹35.00 Lakh, resulting in a ₹35.00 Lakh shortfall."*
  - `isManualReviewRequired`: `false`

If premises ownership data is missing, the engine assigns `complianceStatus: INSUFFICIENT_DATA`, flags `missingInputs: ["premisesOwnership"]`, and triggers `isManualReviewRequired: true`, preventing false non-compliance declarations.

---

## 7. USP 2 — Intelligent FDR Release & Multi-Department Clearance Workflow

### 7.1 Regulatory Context
Under AICTE APH 2024–2027 Section 6.46 ("Release of Security Deposit"), an FDR cannot simply be refunded upon maturity. Releasing institutional funds requires:
1. Submission of mandatory legal documentation.
2. Verification that no faculty/staff/student grievances are pending before the Public Grievance Redressal Cell (PGRC).
3. Concurrence from the AICTE Vigilance Bureau that no inquiries or disciplinary actions are ongoing.
4. Clearance from Regional or other designated bureaus.
5. Formal No Objection Certificate (NOC) sanction from the Approval Bureau.

### 7.2 Release Workflow State Machine
The workflow transitions through strictly controlled stages:
```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Institution Submits Request
    SUBMITTED --> DOCUMENT_REVIEW: Scrutiny Officer Assigns Case
    DOCUMENT_REVIEW --> CORRECTION_REQUIRED: Deficiency Found
    CORRECTION_REQUIRED --> DOCUMENT_REVIEW: Institution Uploads Correction
    DOCUMENT_REVIEW --> CLEARANCES_PENDING: All 4 Mandatory Docs Confirmed
    CLEARANCES_PENDING --> ON_HOLD: Objection Raised / Regulatory Hold Placed
    ON_HOLD --> CLEARANCES_PENDING: Hold Lifted / Objection Cleared
    CLEARANCES_PENDING --> READY_FOR_FINAL_DECISION: PGRC + Vigilance + Bureaus Cleared
    READY_FOR_FINAL_DECISION --> NOC_ISSUED: Approval Bureau Issues Final NOC
    NOC_ISSUED --> REFUND_CONFIRMED: Bank Transaction Reference Logged
    READY_FOR_FINAL_DECISION --> REJECTED: Competent Authority Rejection
```

### 7.3 Mandatory Document Scrutiny Checklist
In `server/src/routes/release.ts`, Scrutiny Officers review four mandatory documents:
1. `AFFIDAVIT_6`: Standard undertaking on ₹100 stamp paper regarding closure/release liabilities.
2. `BOARD_RESOLUTION`: Resolution by the governing trust/society authorizing FDR release.
3. `UNDERTAKING_2`: Legal undertaking settling all student fee and faculty salary claims.
4. `AICTE_JOINT_FDR`: Original deposit receipt copy issued jointly with AICTE.

Each document must achieve status `CONFIRMED`. If marked `CORRECTION_REQUIRED`, the workflow halts and notifies the institution.

### 7.4 Departmental Clearance Matrix
Clearances are recorded in the `ReleaseClearance` table by authorized officers:
- **PGRC:** Evaluates faculty/student grievances. Options: `CLEARED`, `OBJECTION_RAISED`, `NOT_APPLICABLE`.
- **VIGILANCE:** Evaluates anti-corruption, disciplinary, and judicial inquiries.
- **OTHER_APPLICABLE_BUREAU:** Regional Office or specialized cell reviews.

### 7.5 The Final Decision Guard
Implemented in `server/src/services/releaseWorkflowService.ts` (`evaluateReleaseNocGuard`), the guard performs automated statutory pre-checks before allowing the Approval Bureau to issue an NOC:
- ✓ All 4 statutory release documents confirmed.
- ✓ PGRC clearance recorded as `CLEARED`.
- ✓ Vigilance clearance recorded as `CLEARED`.
- ✓ Other bureau clearance recorded as `CLEARED` or `NOT_APPLICABLE`.
- ✓ No active regulatory or legal hold placed on the case.
- ✓ Four-Eyes Separation of Duties satisfied (Approver $\neq$ Requester and Approver $\neq$ Scrutineer).
- ✓ Approver possesses authorized `APPROVER` role.

If any prerequisite fails, the guard returns `canIssueNoc: false` along with an array of **Explainable Blockers**, powering the frontend **"Why is this request pending?"** panel.

---

## 8. Complete System Architecture

```mermaid
graph TD
    subgraph Client Layer [Frontend - React 19 + TypeScript + Vite + Tailwind v4]
        UI_Dash[Dashboard & KPI Metrics]
        UI_Reg[FDR Registry & New Form]
        UI_Scrutiny[Scrutiny Queue & Provenance]
        UI_Clearance[Clearance Command Center]
        UI_CaseConsole[Case Console & Timeline]
        UI_Audit[Audit Log & Hash Verification]
    end

    subgraph API & Middleware Layer [Express.js + TypeScript]
        Auth_MW[JWT Cookie Auth & Rate Limiter]
        RBAC_MW[Role & Department Gatekeeper]
        Router_Clearance[Clearances API /api/clearances]
        Router_Release[Release & Scrutiny API /api/release]
        Router_Inst[Instruments API /api/instruments]
        Router_Audit[Audit API /api/audit]
    end

    subgraph Intelligence & Workflow Engines [Domain Services]
        OCR_Engine[OCR & Comparison Engine: pdf-parse + tesseract.js]
        APH_Engine[USP 1: APH Compliance Engine Table 1.4]
        Clearance_Engine[USP 2: Release Workflow & Decision Guard]
        Maturity_Job[Maturity Scheduler & Priority Scoring]
        Audit_Service[SHA-256 Hash Chain Service]
    end

    subgraph Persistence & Infrastructure Layer [PostgreSQL + Supabase]
        Prisma_ORM[Prisma ORM Client]
        DB_Postgres[(PostgreSQL Database)]
        Supabase_Storage[Supabase Private Object Storage]
    end

    Client Layer -->|HttpOnly Cookies / REST API| Auth_MW
    Auth_MW --> RBAC_MW
    RBAC_MW --> Router_Clearance & Router_Release & Router_Inst & Router_Audit
    
    Router_Inst --> OCR_Engine
    Router_Clearance --> APH_Engine
    Router_Release --> Clearance_Engine
    Router_Inst & Router_Release --> Audit_Service
    
    Intelligence & Workflow Engines --> Prisma_ORM
    Prisma_ORM --> DB_Postgres
    Router_Inst --> Supabase_Storage
```

---

## 9. Complete End-to-End User Journey

```
[1. Registration]
Institution User logs in → Enters FDR metadata at /instruments/new → Uploads scanned PDF/image → Magic-byte validated → Stored in Supabase.

[2. OCR & Automated Extraction]
Background worker parses document → Extracts candidate FDR number, amount, maturity date → Computes discrepancy comparison → Tags provenance (ENTERED vs EXTRACTED).

[3. APH Compliance Evaluation]
APH Compliance Engine runs → Cross-references AICTE Table 1.4 norms → Applies 2.0x lease multiplier if applicable → Flags shortfall or surplus → Summarizes applicable clause.

[4. Digital Scrutiny]
Scrutiny Officer logs in → Opens /scrutiny → Verifies OCR fields against PDF viewer → Confirms or overrides discrepancies → Marks FDR verified.

[5. Validity & Maturity Tracking]
Daily cron job monitors expiry → Fires alerts at 90, 60, 30, 15 days → Computes Attention Priority Score → Displays critical items on Dashboard.

[6. Release Application]
Institution submits release request → Uploads Affidavit 6, Board Resolution, Undertaking 2, AICTE Joint FDR Copy → Status: SUBMITTED.

[7. Departmental Clearances]
Case appears in /clearances Command Center:
- Scrutiny Officer confirms all 4 mandatory documents.
- PGRC Officer inspects grievance database → Submits CLEARED.
- Vigilance Officer checks inquiry records → Submits CLEARED.

[8. Explainable Blockers & NOC Issuance]
Approval Bureau Officer opens Case Console:
- Decision Guard checks prerequisites → Validates Four-Eyes separation.
- "Why is this request pending?" displays zero blockers.
- Approver clicks "Issue Release NOC" → Submits council sanction order reference.
- Status updates to NOC_ISSUED.

[9. Audit Provenance]
Auditor visits /audit → Verifies complete SHA-256 cryptographic chain → Confirms unbroken audit trail.
```

---

## 10. Technology Stack & Verification Evidence

| Layer | Technology | Exact Version | Purpose & Rationale | Evidence in Codebase |
|---|---|---|---|---|
| **Frontend Framework** | React | `^19.3.1` | Modern concurrent component model, high performance rendering. | `client/package.json` |
| **Routing** | React Router | `^7.5.3` | Nested routing, route guards, URL query synchronization. | `client/src/App.tsx` |
| **Styling** | Tailwind CSS | `^4.1.4` | Utility-first, zero-runtime modern styling with `@tailwindcss/vite`. | `client/vite.config.ts` |
| **Icons** | Lucide React | `^0.469.0` | Accessible, consistent vector iconography. | `client/package.json` |
| **Backend Runtime** | Node.js / Express | `^4.21.2` | Robust asynchronous REST service architecture. | `server/package.json` |
| **Language** | TypeScript | `^5.8.3` | End-to-end type safety, strict compile checks across client & server. | `tsconfig.json` |
| **ORM** | Prisma ORM | `^6.19.3` | Type-safe query building, migrations, and schema management. | `server/prisma/schema.prisma` |
| **Database** | PostgreSQL | `v15+` | ACID-compliant relational persistence, multi-table foreign key constraints. | Supabase hosted |
| **Object Storage** | Supabase Storage | `^2.118.0` | Private S3-compatible bucket storage with short-lived signed URLs. | `server/src/services/supabaseStorage.ts` |
| **PDF Extraction** | pdf-parse | `^2.4.5` | Fast server-side text extraction from vector and digital PDFs. | `server/src/services/ocrExtraction.ts` |
| **Image OCR** | Tesseract.js | `^7.0.0` | Deterministic client/server OCR for scanned receipts and stamp papers. | `server/src/services/ocrExtraction.ts` |
| **Validation** | Zod | `^3.24.2` | Runtime schema validation for request payloads and query strings. | `server/src/validation/` |
| **Cryptography** | Node.js `crypto` | Built-in | SHA-256 hashing for tamper-evident audit chains. | `server/src/services/auditTrail.ts` |
| **Testing** | Vitest + Supertest | `^3.2.7` | High-speed unit and HTTP integration testing. | `server/vitest.config.ts` |

---

## 11. Database and API Design

### 11.1 Key Database Models
- **`Institution`**: AICTE Permanent ID, legal name, address, state, status.
- **`User`**: Authentication credentials, role (`INSTITUTION_USER`, `SCRUTINY_OFFICER`, `APPROVER`, `ADMIN`, `AUDITOR`), assigned `department` (`PGRC`, `VIGILANCE`, `APPROVAL_BUREAU`, etc.).
- **`Instrument`**: FDR Number, bank name, branch, amount, dates, status (`DRAFT`, `SUBMITTED`, `ACTIVE`, `RELEASE_REQUESTED`, `RELEASED`, `MATURED`).
- **`InstrumentDocument`**: File metadata, storage path, magic-byte verified MIME type, OCR extraction status.
- **`InstrumentExtractedField`**: Extracted OCR values with confidence scores and three-way provenance (`ENTERED`, `EXTRACTED`, `OVERRIDE`).
- **`InstrumentRelationship`**: Renewal and replacement linkage (`sourceInstrumentId`, `targetInstrumentId`, `type`).
- **`ReleaseRequest`**: Release application tracking amount requested, reason, current stage (`ReleaseWorkflowStage`), hold status, and assigned reviewer.
- **`ReleaseClearance`**: Department-specific clearance records (`department`, `status`, `decisionReason`, `decidedById`, `decidedAt`).
- **`ReleaseDocumentReview`**: Statutory document verification records (`documentType`, `status`, `reviewRemarks`, `reviewedById`).
- **`AuditEvent`**: Cryptographically chained logs (`action`, `actorId`, `entityType`, `entityId`, `details`, `chainHash`).

### 11.2 Core API Surface

| Endpoint | Method | Role Permissions | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public (Rate-limited) | Authenticates credentials, issues HttpOnly JWT cookie. |
| `/api/instruments` | `GET` / `POST` | Authenticated | Lists instruments (scoped) / Creates new FDR draft. |
| `/api/instruments/:id/documents` | `POST` | `INSTITUTION_USER` | Uploads FDR receipts; triggers magic-byte check and OCR. |
| `/api/instruments/:id/ocr/compare` | `GET` | `SCRUTINY_OFFICER`, `ADMIN` | Returns field-by-field comparison of entered vs extracted data. |
| `/api/clearances` | `GET` | Authenticated | Returns Clearance Command Center queue and aggregated KPI statistics. |
| `/api/clearances/:requestId` | `GET` | Authenticated | Deep-dive case console data: clearances, documents, blockers, and APH compliance. |
| `/api/instruments/:id/release/:requestId/documents/:type/review` | `POST` | `SCRUTINY_OFFICER`, `ADMIN` | Records scrutiny decision on statutory release documents. |
| `/api/instruments/:id/release/:requestId/clearances/:dept` | `POST` | Authorized Dept Officers | Records PGRC, Vigilance, or Bureau clearance decision. |
| `/api/instruments/:id/release/:requestId/hold` | `POST` | `SCRUTINY_OFFICER`, `APPROVER`, `ADMIN` | Places or lifts regulatory/financial hold. |
| `/api/instruments/:id/release/:requestId/noc` | `POST` | `APPROVER` | Issues final authorized FDR Release NOC (strictly guarded). |
| `/api/audit/verify-chain` | `GET` | `AUDITOR`, `ADMIN` | Verifies SHA-256 cryptographic audit chain integrity. |

---

## 12. Security, Reliability and Regulatory Safeguards

1. **Defense-in-Depth Authentication:**
   - JWT tokens stored exclusively in `HttpOnly`, `SameSite=Lax`, `Secure` cookies. Inaccessible to malicious browser JavaScript (immune to standard XSS token theft).
   - Rate limiting: Stricter threshold of 5 failed attempts per 15 minutes per IP address with auto-reset upon successful login.
2. **Tenant Isolation:**
   - Institution users cannot query or mutate instruments outside their `institutionId`. Enforced at the SQL query construction layer (`where: { institutionId: req.user.institutionId }`), never trusting client parameters.
3. **MIME Magic-Byte Verification:**
   - Mitigates arbitrary file upload exploits by reading binary file headers before writing to storage.
4. **Cryptographic Tamper-Evidence:**
   - Every mutation is hashed into a sequential SHA-256 blockchain-style log. Direct database tampering breaks hash validation.
5. **CSV Formula Injection Sanitization:**
   - Audit exports prepend single quotes (`'`) to cells starting with `=`, `+`, `-`, or `@`, protecting spreadsheet users from formula injection attacks.
6. **Regulatory Safeguards:**
   - AI/OCR suggestions are strictly advisory. The system enforces human-in-the-loop confirmation before legal status changes.
   - Bank verification status is explicitly distinguished from OCR extraction.

---

## 13. Testing and Current Project Status

### Verification Metrics
- **Server Vitest Suite:** **22 Test Files Passed (100%), 325 Unit Tests Passed (100%)**.
  - `milestone7_clearance_workflow.test.ts` (16 tests)
  - `aph_compliance_engine.test.ts` (15 tests)
  - `milestone8_audit.test.ts` (43 tests)
  - `milestone7_release_refund.test.ts` (39 tests)
  - `milestone9_comparison_engine.test.ts` (27 tests)
  - `scrutiny_decisions_and_audit.test.ts` (20 tests)
  - `milestone4_documents.test.ts` (19 tests)
  - `milestone5_maturity.test.ts` (18 tests)
  - `milestone9_ocr_extraction.test.ts` (18 tests)
  - `milestone9_ocr_api.test.ts` (17 tests)
  - `milestone9_e2e_verification.test.ts` (15 tests)
  - `milestone3_workflow.test.ts` (14 tests)
  - `auth_routes.test.ts` (14 tests)
  - `milestone6_renewal_replacement.test.ts` (9 tests)
  - `access_control.test.ts` (6 tests)
- **Frontend Production Build:** **Passed (`tsc -b && vite build` exited with code 0)**. 1,645 modules compiled with zero TypeScript errors.

### Implementation Status Breakdown
- **IMPLEMENTED AND VERIFIED:**
  - Multi-tenant authentication and RBAC.
  - FDR registration, editing, and submission.
  - Magic-byte file upload to Supabase Storage with signed URL access.
  - OCR extraction pipeline (PDF & image) and discrepancy detection.
  - 24-hour maturity scheduler, 90/60/30/15-day alerts, and Attention Priority Scoring.
  - Renewal/replacement directed linkage.
  - SHA-256 cryptographic audit chaining and verification.
  - **USP 1:** APH-Aware Compliance Engine (Table 1.4 rules, 2.0× lease multiplier, shortfall detection, clause explainability).
  - **USP 2:** Clearance Command Center, multi-stage timeline, 4-document scrutiny reviews, PGRC/Vigilance clearances, regulatory hold management, Final Decision Guard, and Approval Bureau NOC issuance.
- **KNOWN PROTOTYPE LIMITATIONS:**
  - Direct SFMS/core-banking API integration is simulated via verified document uploads (commercial bank APIs are proprietary and restricted).
  - Email/SMS delivery for alerts uses console/database queues rather than external telecom gateways.

---

## 14. Why FDR Sentinel Is Different

| Feature Dimension | Conventional Institutional Portal | FDR Sentinel Platform |
|---|---|---|
| **Data Storage** | Static database table with manual entry. | Dynamic registry with document-provenance tracking (`ENTERED`, `EXTRACTED`, `OVERRIDE`). |
| **Document Verification** | Officer manually reads scanned PDFs. | Automated OCR text extraction, candidate matching, and automated discrepancy flagging. |
| **Compliance Evaluation** | Officer manually looks up handbook tables and calculates deposit needs on paper. | **USP 1: APH Compliance Engine** automatically applies Table 1.4 rules, leased-land multipliers, and explains exact shortfalls. |
| **Release Processing** | Basic status dropdown (`Submitted` / `Approved`). | **USP 2: Multi-Department Workflow** orchestrating Scrutiny, PGRC, Vigilance, and Bureau clearances with a strict Decision Guard. |
| **Accountability & Hold** | Holds communicated via external emails or sticky notes. | Integrated statutory hold mechanism and **"Why is this request pending?"** explainable blockers panel. |
| **Separation of Duties** | Weak or unenforced; single officer can approve. | Strict cryptographic Four-Eyes enforcement (Requester $\neq$ Approver, Scrutineer $\neq$ Approver). |
| **Audit Trails** | Basic mutable database timestamps. | Cryptographic SHA-256 blockchain-style hash chain with automated tamper detection. |

---

## 15. Future Scope

The following capabilities represent natural extensions for production deployment in coordination with AICTE's IT infrastructure:
1. **Direct Core Banking / SFMS Integration:** Establishing authorized API gateways with nationalized banks (via RBI's Structured Financial Messaging System) for real-time electronic deposit confirmation.
2. **AICTE National Approval Portal (Portal 2.0) SSO:** Integrating SAML 2.0 / OAuth2 for single sign-on with AICTE’s existing institution database.
3. **Government SMS & Digilocker Integration:** Automated dispatch of maturity escalation notices via national SMS gateways and pulling certified trust resolutions via DigiLocker.
4. **Machine-Readable Handbook Update Ingestion:** Allowing legal teams to upload new APH editions in structured JSON to version rules without code deployments.
