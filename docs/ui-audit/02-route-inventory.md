# 02 - Route & Page Inventory

**Audit Date:** 2026-10-28  
**Verification:** Routes from client/src/App.tsx (VERIFIED). Page components inspected (VERIFIED).

## 2.1 Route Map (VERIFIED)

| Route | Component | Access | Notes |
|-------|-----------|--------|-------|
| /login | pages/LoginPage.tsx | Public | Auth form with dev-only demo quick-fill, password toggle, redirects if logged in. |
| / | Navigate to /dashboard (replace) | Public redirect | ProtectedRoute redirects to /login if unauthenticated. |
| /dashboard | pages/DashboardPage.tsx | Protected | Role-aware dashboard with SVG charts, due-within-90-days, quick links. AppShell. |
| /instruments | pages/InstrumentsPage.tsx | Protected | FDR Registry with search/filters/sort, metrics, role-aware actions. |
| /instruments/new | pages/RegisterInstrumentPage.tsx | Protected | Registration form (nav only for INSTITUTION_USER). |
| /instruments/:id | pages/InstrumentDetailPage.tsx | Protected | Detailed instrument view (876 lines). |
| /scrutiny | pages/ScrutinyQueuePage.tsx | Protected | Scrutiny queue (officer roles). |
| /clearances | pages/ClearanceCommandCenterPage.tsx | Protected | Clearance command center. |
| /clearances/:releaseRequestId | pages/ClearanceCaseDetailPage.tsx | Protected | Clearance case detail. |
| /maturities | pages/MaturitiesPage.tsx | Protected | Maturities view. |
| /profile | pages/ProfilePage.tsx | Protected | User profile. |
| /audit | pages/AuditLogPage.tsx | Protected | Audit log (restricted roles). |
| * | pages/NotFoundPage.tsx | Unwrapped by ProtectedRoute (INFERRED) | Renders inside AppShell per component. |

## 2.2 Page Details (VERIFIED)

- LoginPage (314): brand header, auth card with email/password, show/hide, submit with loading, dev-only demo accounts quick-fill (5 accounts), security note.
- DashboardPage (699): AppShell+ErrorBoundary, lifecycle horizontal bar SVG, monthly maturity vertical bar SVG, due-within-90-days list, APH/Clearance quick links. Fetches dashboard metrics + instruments.
- InstrumentsPage (372): header with role-based title/CTA, success/error banners, metric cards, filters/search/sort/refresh, table with actions (Inspect, Submit draft for institution users).
- RegisterInstrumentPage (488): FDR registration form (INFERRED full fields from context).
- InstrumentDetailPage (876): comprehensive detail view with documents/OCR/scrutiny/release/clearance elements (INFERRED).
- ScrutinyQueuePage (400), ClearanceCommandCenterPage (187), ClearanceCaseDetailPage (450), MaturitiesPage (334), ProfilePage (167), AuditLogPage (687), NotFoundPage (32).
