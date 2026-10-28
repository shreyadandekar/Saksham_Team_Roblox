# 06 - Screenshot Checklist

**Audit Date:** 2026-10-28
**Purpose:** Manual screenshots to capture before redesigning in Google Stitch. Capture at desktop and mobile views as specified.

## 6.1 Global States (VERIFIED)
- [ ] **App header (logged in)** - Desktop: logo, nav context, user name/role, initials, sign out button. Mobile: hamburger visible.
- [ ] **Sidebar (desktop)** - Full sidebar with all nav items visible for a role that sees most items (e.g., ADMIN/SYSTEM_ADMIN). Show active state (amber bar).
- [ ] **Mobile drawer sidebar** - Open drawer showing nav items.
- [ ] **Footer** - "Saksham · SIH 2026 prototype (PS26265) · All records shown are synthetic demonstration data."
- [ ] **Loading states** - ProtectedRoute loading screen, page loading spinners (e.g., Dashboard loading).
- [ ] **Error states** - Dashboard error banner example if possible.

## 6.2 Auth (VERIFIED)
- [ ] **Login page (desktop)** - Full page with brand, auth card, demo accounts section.
- [ ] **Login page (mobile)** - Responsive layout.
- [ ] **Demo accounts expanded** - Show all 5 demo accounts with labels/roles/emails.
- [ ] **Login error state** - Invalid credentials error message.
- [ ] **Password show/hide** - Toggle state.

## 6.3 Dashboard (VERIFIED)
- [ ] **Dashboard (desktop)** - Full page with both chart cards, due-within-90-days, quick links.
- [ ] **Dashboard (mobile)** - Stacked layout.
- [ ] **Lifecycle chart card** - Close-up of horizontal bar chart with legend.
- [ ] **Maturity chart card** - Close-up of vertical bar chart with labels.
- [ ] **Due within 90 days section** - List with badges and dates.
- [ ] **Quick links cards** - APH Compliance Engine and Clearance Command Center.

## 6.4 Instruments (FDR Registry) (VERIFIED)
- [ ] **Instruments list (desktop)** - Header, metric cards, filters, table.
- [ ] **Instruments list (mobile)** - Responsive table/cards.
- [ ] **Filters expanded** - Search, status filter, sort controls.
- [ ] **Empty state** - For institution user with no instruments (show CTA).
- [ ] **Status badges** - Various statuses in table.
- [ ] **Actions** - Inspect link, Submit button for DRAFT (institution user).
- [ ] **Institution column** - Visible for non-institution users.

## 6.5 Register Instrument (VERIFIED)
- [ ] **Register FDR page (desktop)** - Full form.
- [ ] **Register FDR page (mobile)** - Responsive form.
- [ ] **Form sections/fields** - Capture all visible sections.

## 6.6 Instrument Detail (VERIFIED)
- [ ] **Instrument detail (desktop)** - Main details, tabs/sections.
- [ ] **Instrument detail (mobile)** - Responsive layout.
- [ ] **Documents section** - Document list/upload if visible.
- [ ] **OCR section** - OCR components if present.
- [ ] **Actions/buttons** - Role-specific actions.

## 6.7 Scrutiny (VERIFIED)
- [ ] **Scrutiny queue (desktop)** - Queue list/filters.
- [ ] **Scrutiny decision modal** - Open modal state.

## 6.8 Clearances (VERIFIED)
- [ ] **Clearance command center (desktop)** - Stats, filters, table.
- [ ] **Clearance case detail (desktop)** - Case details, timeline, actions.
- [ ] **Clearance modals** - Department clearance, document review, hold, issue NOC, blockers panel (capture key modals).

## 6.9 Maturities, Profile, Audit (VERIFIED)
- [ ] **Maturities page** - List/tracking view.
- [ ] **Profile page** - User profile details.
- [ ] **Audit log page** - Table with filters, metadata viewer if opened.

## 6.10 Misc (VERIFIED)
- [ ] **404 page** - NotFoundPage.
- [ ] **Access restricted state** - ProtectedRoute access restricted view (if possible with wrong role).
- [ ] **Hover states** - Key interactive elements (nav, buttons, table rows) if desired.

## 6.11 Screenshot Notes
- Capture both **desktop (e.g., 1280px/1440px)** and **mobile (e.g., 375px/390px)** for key pages.
- Capture **modal/dialog states** open (scrutiny decision, clearance modals) as they are important interactions.
- Capture **role-specific views** if you can switch roles (using demo accounts) - Institution User vs Scrutiny Officer vs Admin views differ (nav visibility, actions).
- All screenshots are **manual** - do not rely on automated capture. The app may need to be running to see data; inspection was read-only of codebase.
- Mark items as **NOT TESTED** if you cannot capture due to auth/data state - this matches audit requirements.
