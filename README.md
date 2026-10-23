# FDR Sentinel

> **SIH 2026 – Problem Statement PS26265**
> Streamline of Security Deposit / Fixed Deposit Receipt (FDR) Portal prototype.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture & Security Decisions](#architecture--security-decisions)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [First-Time Setup](#first-time-setup)
- [Database Configuration & Migrations](#database-configuration--migrations)
- [Development Seed Data & Demo Accounts](#development-seed-data--demo-accounts)
- [Running in Development](#running-in-development)
- [Testing](#testing)
- [Type Checking & Building](#type-checking--building)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer    | Technology                                    |
| -------- | --------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| Routing  | React Router v7                               |
| Icons    | Lucide React                                  |
| Backend  | Node.js, Express 4, TypeScript                |
| Validation | Zod                                         |
| Security | bcryptjs, jsonwebtoken, cookie-parser (HttpOnly) |
| Database | PostgreSQL + Prisma ORM v6                    |

---

## Architecture & Security Decisions

1. **HttpOnly, SameSite=Lax JWT Cookies**:
   - The frontend never places access tokens into `localStorage` or `sessionStorage`, eliminating token theft via Cross-Site Scripting (XSS).
   - Cookies are transmitted automatically across the Vite development proxy (`/api/*` on port 5173 forwarded to port 4000).
   - `Authorization: Bearer <token>` is also supported for headless/API clients.

2. **Database-Backed Identity Verification**:
   - Authentication middleware does not blindly trust decoded JWT claims. On every protected request, the user's active status and role are verified against PostgreSQL.
   - Deactivated accounts are locked out immediately, even if a previous token has not yet expired.

3. **Backend Institution-Level Isolation**:
   - Institution users can only retrieve instruments matching their authenticated `institutionId`.
   - The query filter is derived strictly from the verified session identity—never from client query parameters.
   - AICTE Officers and System Administrators have system-wide regulatory scrutiny access.

4. **Preservation of Financial History**:
   - Foreign-key constraints on instruments and audit events use `Restrict` or `SetNull` to prevent cascading deletion of regulatory and audit history.

---

## Project Structure

```
FDR-Sentinel/
├── client/
│   ├── src/
│   │   ├── api/auth.ts                 # Cookie-backed API client
│   │   ├── components/
│   │   │   ├── auth/ProtectedRoute.tsx  # Route guard with RBAC checks
│   │   │   └── layout/AppShell.tsx     # Shell with user badge & logout
│   │   ├── context/AuthContext.tsx     # Centralized session state
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # Role-specific instrument view
│   │   │   ├── LoginPage.tsx           # Login form + demo quick-fill
│   │   │   └── NotFoundPage.tsx
│   │   ├── types/auth.ts
│   │   ├── App.tsx                     # React Router routes
│   │   └── index.css                   # Tailwind CSS v4 @import
│   ├── .env.example
│   └── vite.config.ts                  # /api proxy to Express :4000
├── server/
│   ├── prisma/
│   │   ├── schema.prisma               # PostgreSQL models & enums
│   │   ├── migrations/                 # Version-controlled migrations
│   │   └── seed.ts                     # Deterministic demo seed script
│   ├── src/
│   │   ├── config/env.ts               # Zod-validated environment config
│   │   ├── db/prisma.ts                # Prisma singleton instance
│   │   ├── middleware/auth.ts          # requireAuth & requireRoles
│   │   ├── routes/
│   │   │   ├── auth.ts                 # login, logout, me
│   │   │   ├── health.ts               # GET /api/health
│   │   │   └── instruments.ts          # Institution-isolated instruments
│   │   ├── types/auth.ts               # SafeUser & Request augmentation
│   │   ├── utils/
│   │   │   ├── jwt.ts                  # Typed token sign/verify
│   │   │   └── password.ts             # bcryptjs hashing
│   │   ├── app.ts                      # Express app factory
│   │   └── index.ts                    # Server entry point
│   ├── tests/                          # Vitest unit test suite
│   ├── .env.example
│   └── tsconfig.json
├── .gitignore
├── package.json                        # Root workspace scripts
└── README.md
```

---

## Prerequisites

| Tool       | Minimum Version | Check command           |
| ---------- | --------------- | ----------------------- |
| Node.js    | 20 LTS          | `node --version`        |
| npm        | 10              | `npm --version`         |
| PostgreSQL | 15 (Local or Supabase) | `psql --version` |

---

## First-Time Setup

Run these commands in Windows PowerShell from the repo root:

### 1 — Install dependencies

```powershell
npm install
npm install --prefix server
npm install --prefix client
```

### 2 — Configure environment files

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env.local
```

Generate a secure JWT secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `server\.env`:
- Set `JWT_SECRET` to the generated 64-character hex string.
- Set `DATABASE_URL` to your PostgreSQL database connection string.

---

## Database Configuration & Migrations

### If using local PostgreSQL:

```powershell
# Create the database
psql -U postgres -c "CREATE DATABASE fdr_sentinel;"

# Apply migration using Prisma
npm run prisma:deploy --prefix server
```

### If using Supabase / Hosted PostgreSQL:

Paste your connection string into `server\.env`:
```env
DATABASE_URL=postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Then deploy the schema:
```powershell
npm run prisma:deploy --prefix server
```

---

## Development Seed Data & Demo Accounts

Populate deterministic, synthetic demo records across all roles:

```powershell
npm run seed --prefix server
```

### Seeded Demo Accounts (Development Only)

All demo accounts share the password: **`Demo@FDR2026!`**

| Role | Name | Email | Scope |
| ---- | ---- | ----- | ----- |
| **INSTITUTION_USER** | Dr. Rajesh Verma | `inst.delhi@demo.fdr-sentinel.gov.in` | Delhi Institute of Advanced Eng. (FDR-SBI-2026-901, FDR-PNB-2026-902) |
| **INSTITUTION_USER** | Prof. Sunita Deshmukh | `inst.pune@demo.fdr-sentinel.gov.in` | Maharashtra Inst. of Pharm. (FDR-BOB-2026-801) |
| **AICTE_OFFICER** | Anil Sharma | `officer.sharma@demo.fdr-sentinel.gov.in` | System-wide regulatory scrutiny |
| **SYSTEM_ADMIN** | Pooja Kulkarni | `admin.sentinel@demo.fdr-sentinel.gov.in` | System administration & audits |

*(The login page features quick one-click autofill buttons for each account.)*

---

## Running in Development

```powershell
npm run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

---

## Testing

Run the isolated test suite (28 unit tests, independent of live database availability):

```powershell
npm test --prefix server
```

Covers:
- Password hashing & constant-time comparison
- JWT generation, valid verification, expired token rejection, tampered signatures
- Auth middleware (`requireAuth`): missing tokens, invalid tokens, inactive accounts
- RBAC middleware (`requireRoles`): authorized vs unauthorized roles
- Institution isolation on `/api/instruments`: query scoping, anti-leakage
- Auth endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Seed script repeatability logic

---

## Type Checking & Building

```powershell
# Typecheck both packages without emitting files
npm run typecheck

# Production build (Vite bundle -> client/dist, tsc -> server/dist)
npm run build
```

---

## API Reference

### Public Endpoints

- `GET /api/health` — Liveness probe.
- `POST /api/auth/login` — Accepts `{ email, password }`, returns `{ token, user }` and sets HttpOnly cookie `fdr_token`.
- `POST /api/auth/logout` — Clears `fdr_token` cookie.

### Protected Endpoints (Requires HttpOnly cookie or Bearer token)

- `GET /api/auth/me` — Returns current user's safe profile (`{ id, fullName, email, role, institutionId }`).
- `GET /api/instruments` — Returns instrument records filtered by the caller's institution (or system-wide for officers/admins).
