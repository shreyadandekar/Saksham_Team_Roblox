# 01 - Current UI Audit

**Project:** Saksham – Intelligent Security Deposit Compliance & Clearance Management (SIH 2026 PS26265)  
**Audit Date:** 2026-10-28  
**Audit Mode:** Read-only inspection (no modifications made to repository)  
**Repository:** /Users/aryanvinaykadam/Desktop/Saksham/Saksham_Team_Roblox  

---

## 1.1 Technology Stack (VERIFIED)

### Frontend
| Technology | Version | Purpose | File References |
|-----------|---------|---------|-----------------|
| React | ^19.3.1 | UI framework | client/package.json:15-16 |
| TypeScript | ~5.8.3 | Type safety | client/package.json:27 |
| Vite | ^6.3.5 | Build tool/dev server | client/package.json:28, client/vite.config.ts |
| React Router DOM | ^7.5.3 | Routing | client/package.json:17, client/src/App.tsx |
| Tailwind CSS | ^4.1.4 (v4 via @tailwindcss/vite) | Styling system | client/package.json:20,26, client/src/index.css:1 |
| Lucide React | ^0.469.0 | Icon library | client/package.json:14 |

### Backend
| Technology | Version | Purpose | File References |
|-----------|---------|---------|-----------------|
| Node.js/Express | ^4.21.2 | API server | server/package.json:29 |
| TypeScript | ^5.8.3 | Type safety | server/package.json:50 |
| Prisma ORM | ^6.19.3 | Database ORM | server/package.json:22,47 |
| PostgreSQL | (via Prisma) | Database | README.md:57, server/prisma/* |
| Zod | ^3.24.2 | Validation | server/package.json:35 |
| JWT (jsonwebtoken) | ^9.0.3 | Auth tokens | server/package.json:30 |
| bcryptjs | ^3.0.3 | Password hashing | server/package.json:25 |
| cookie-parser | ^1.4.7 | HttpOnly cookie handling | server/package.json:26 |

### Additional Libraries
- Frontend: No charting library detected. Dashboard charts are inline SVG (client/src/pages/DashboardPage.tsx:429-699).
- Server: multer, pdf-parse, tesseract.js (OCR), @supabase/supabase-js, uuid. See server/package.json:23-34.

---

## 1.2 Project Structure (VERIFIED)
See full tree in README and file listing. Client has api/, components/, context/, pages/, types/, utils/, assets/. Server has routes/, middleware/, services/, utils/, lib/, config/, prisma/.

---

## 1.3 Routing Architecture (VERIFIED)
React Router v7 in client/src/main.tsx and App.tsx. AuthProvider wraps app. ProtectedRoute guards routes, redirects to /login if unauthenticated, checks roles if specified. Root / redirects to /dashboard. Routes listed in App.tsx: /login (public), /dashboard, /instruments, /instruments/new, /instruments/:id, /scrutiny, /clearances, /clearances/:releaseRequestId, /maturities, /profile, /audit (all protected), * -> NotFoundPage.

---

## 1.4 Global Styling & Design Tokens (VERIFIED)
index.css defines CSS custom properties via @theme (brand/dark/primary/accent, page-bg, card-bg, sidebar-bg/active, borders, text colors, Inter font, radius-card). Light mode enforced. Inter from Google Fonts. Logo at /assets/saksham-logo.png.

---

## 1.5 Layout System (VERIFIED)
AppShell provides sticky header, desktop sidebar with role-based nav and amber active bar, mobile drawer, content max-width constraints, footer. ProtectedRoute handles loading/access states.

---

## 1.6 State Management & Auth (VERIFIED)
AuthContext uses cookie-based session via GET /api/auth/me. API uses credentials:'include', no localStorage tokens. Roles include INSTITUTION_USER, SCRUTINY_OFFICER, APPROVER, ADMIN, AUDITOR, AICTE_OFFICER, SYSTEM_ADMIN.

---

## 1.7 API Integration Pattern (VERIFIED)
Vite proxy /api -> :4000. API modules use fetch with credentials include. Server has routes under /api/* (auth, users, instruments, scrutiny, clearances, release, documents, ocr, custody, dashboard, audit, health, monitoring). Live API behavior NOT TESTED.

---

## 1.8 Summary of Current UI Character (VERIFIED)
Clean business UI: white cards, slate borders, subtle shadows, Inter. Navy/dark blue primary, amber accents. Sidebar navigation with active indicator. Login has dev-only demo quick-fill. Dashboard matches reference layout with SVG charts. Prototype/educational tone with synthetic data notices.
