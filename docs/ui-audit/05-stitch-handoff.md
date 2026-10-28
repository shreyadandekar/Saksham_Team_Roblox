# 05 - Stitch Handoff Specification

**Audit Date:** 2026-10-28
**Purpose:** Detailed handoff for redesigning in Google Stitch. Read-only inspection; no code changes made.

## 5.1 Application Overview (VERIFIED)
Saksham is a SIH 2026 prototype (PS26265) for Intelligent Security Deposit Compliance & Clearance Management. It manages FDR/security deposits with roles (Institution User, Scrutiny Officer/AICTE Officer, Approver, Admin/System Admin, Auditor). Features include FDR registry, scrutiny workflow, clearance command center with multi-department clearances, APH compliance engine references, maturities tracking, release/refund workflow, document upload/OCR, custody tracking, audit log, role-based access. Auth uses HttpOnly cookies.

**Sources:** README.md, App.tsx, routes, features observed.

## 5.2 Tech Stack for Handoff (VERIFIED)
- Frontend: React 19 + TypeScript + Vite + React Router v7 + Tailwind CSS v4 + Lucide React
- Backend: Express + Prisma + PostgreSQL (not to be changed)
- Auth: Cookie-based (HttpOnly), RBAC
- Build: Vite

## 5.3 Pages to Reproduce (VERIFIED)
All routes from App.tsx must be considered: /login, /dashboard, /instruments, /instruments/new, /instruments/:id, /scrutiny, /clearances, /clearances/:releaseRequestId, /maturities, /profile, /audit, 404. Each has specific layout/sections as documented in 02-route-inventory.md.

## 5.4 Design Constraints (VERIFIED/CRITICAL)
- **Do NOT** change backend logic, APIs, DB schema, routes, auth, config.
- **Preserve functionality:** All existing user workflows must remain functional after redesign (forms, tables, filters, modals, role-based visibility, API integrations). Backend contracts unchanged.
- **Preserve auth model:** HttpOnly cookie auth, role checks.
- **Preserve routing:** Same routes/params.
- **Preserve data:** No changes to data layer.
- **Assets:** Logo at /assets/saksham-logo.png exists; can be reused or replaced if needed but must not remove required references without understanding - better to preserve logo usage.
- **No fabrication:** Do not add government emblems/seals/certifications/official affiliations.
- **Synthetic data notices:** Footer says "All records shown are synthetic demonstration data." Consider keeping appropriate disclaimers if relevant.
- **Dev-only elements:** Login has "Demo Accounts (Development Only)" section - may be kept or styled, but functionality is dev-only.

## 5.5 Current Layout Structure (VERIFIED)
- **Shell:** Top header (brand + user + sign out), left sidebar (role-based nav with amber active bar), mobile drawer, main content area max-w-7xl, footer.
- **Dashboard:** 2-column cards top (lifecycle bar chart, maturity bar chart), bottom due-within-90-days, quick links.
- **Tables:** Standard data tables with filters, status badges, actions.
- **Forms:** Login form, registration form (instruments), various modals for workflows.
- **Modals:** Many clearance/release/scrutiny/OCR modals - need to preserve triggers/behavior.

## 5.6 Design Tokens to Migrate/Improve (VERIFIED)
Current tokens in index.css. For government-oriented redesign, recommend:
- More restrained color palette (e.g., deep navy/blue for headers, slate for text, minimal accent colors)
- Stronger typography hierarchy
- Consistent spacing scale
- Accessible contrast
- Structured navigation
- Clean tables/forms

But must not break existing class usage patterns drastically? Stitch will generate new styles; need to ensure components still work with existing structure or plan mapping. However redesign means new UI - but functionality preserved. Coordinate carefully.

## 5.7 API Endpoints/Integrations to Preserve (INFERRED from codebase)
API modules exist for: auth (login/logout/me), instruments (CRUD/submit), dashboard (metrics), clearances, scrutiny, release, documents, ocr, custody, relationships, audit. All use /api/* via proxy with credentials include. Frontend expects specific response shapes (types in client/src/types). Redesign must not change API calls.

## 5.8 Handoff Checklist for Stitch
1. **Inventory:** Use routes/pages/components from this audit as source of truth.
2. **Preserve structure:** Keep route structure identical.
3. **Preserve functionality:** Every button/form/modal must remain functional or be reimplemented with same behavior.
4. **Role-based UI:** Respect role visibility rules from AppShell and ProtectedRoute.
5. **Auth flow:** Login/logout/session preservation.
6. **Data display:** Tables, badges, charts data come from APIs - preserve data binding.
7. **Assets:** Use existing logo or ensure accessible replacement.
8. **Responsive:** Maintain/improve responsive behavior.
9. **Accessibility:** Improve contrast/focus states/keyboard nav where possible.
10. **No new backend:** All logic stays.

## 5.9 Files to Reference
- Routes: client/src/App.tsx
- Shell: client/src/components/layout/AppShell.tsx
- Auth: client/src/context/AuthContext.tsx, client/src/components/auth/ProtectedRoute.tsx
- Pages: all client/src/pages/*.tsx
- Components: client/src/components/**/*.tsx
- Styles/tokens: client/src/index.css
- API: client/src/api/*.ts
- Types: client/src/types/*.ts
- Config: client/vite.config.ts, client/index.html

## 5.10 Notes
- Dashboard charts are inline SVG (no chart lib) - can be reimplemented or replaced but must show same data.
- Many modals exist for workflows - critical to preserve.
- Demo accounts on login are dev-only - style as appropriate.
- Footer mentions prototype/synthetic data - consider keeping or updating carefully.
