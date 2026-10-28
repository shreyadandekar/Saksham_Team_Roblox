# 03 - Component Inventory

**Audit Date:** 2026-10-28  
**Verification:** Components listed from filesystem (VERIFIED). Key components inspected.

## 3.1 Layout & Auth (VERIFIED)
| Component | Path | Purpose | Props/Notes |
|-----------|------|---------|-------------|
| AppShell | client/src/components/layout/AppShell.tsx | Master shell: header, sidebar (role-based), mobile drawer, footer | children: ReactNode. Uses useAuth, useNavigate, useLocation. Role-based nav logic. |
| ProtectedRoute | client/src/components/auth/ProtectedRoute.tsx | Route guard with loading, auth check, role check | children, allowedRoles?. Uses useAuth. |

## 3.2 Common (VERIFIED)
| Component | Path | Purpose | Notes |
|-----------|------|---------|-------|
| StatusBadge | client/src/components/common/StatusBadge.tsx | Status display (referenced in pages) | Used by InstrumentsPage. |
| ErrorBoundary | client/src/components/common/ErrorBoundary.tsx | Error boundary wrapper | Used by DashboardPage. |

## 3.3 Clearance Module (VERIFIED)
| Component | Path | Purpose |
|-----------|------|---------|
| AphComplianceCard | client/src/components/clearance/AphComplianceCard.tsx | APH compliance display |
| ClearanceFilters | client/src/components/clearance/ClearanceFilters.tsx | Filters for clearances |
| ClearanceStatsCards | client/src/components/clearance/ClearanceStatsCards.tsx | Stats cards |
| ClearanceTable | client/src/components/clearance/ClearanceTable.tsx | Clearance table |
| ClearanceTimeline | client/src/components/clearance/ClearanceTimeline.tsx | Timeline view |
| DepartmentClearanceModal | client/src/components/clearance/DepartmentClearanceModal.tsx | Department clearance action modal |
| DocumentReviewModal | client/src/components/clearance/DocumentReviewModal.tsx | Document review modal |
| ExplainableBlockersPanel | client/src/components/clearance/ExplainableBlockersPanel.tsx | Blockers explanation panel |
| HoldModal | client/src/components/clearance/HoldModal.tsx | Hold action modal |
| IssueNocModal | client/src/components/clearance/IssueNocModal.tsx | Issue NOC modal |

## 3.4 Documents (VERIFIED)
| Component | Path | Purpose |
|-----------|------|---------|
| DocumentList | client/src/components/documents/DocumentList.tsx | List documents |
| DocumentUpload | client/src/components/documents/DocumentUpload.tsx | Upload documents |

## 3.5 OCR (VERIFIED)
| Component | Path | Purpose |
|-----------|------|---------|
| OcrComparisonTable | client/src/components/ocr/OcrComparisonTable.tsx | OCR comparison results |
| OcrReviewCard | client/src/components/ocr/OcrReviewCard.tsx | OCR review card |
| OcrReviewModal | client/src/components/ocr/OcrReviewModal.tsx | OCR review modal |
| OcrStatusBadge | client/src/components/ocr/OcrStatusBadge.tsx | OCR status badge |

## 3.6 Custody, Release, Scrutiny, Relationships, Audit (VERIFIED)
| Component | Path | Purpose |
|-----------|------|---------|
| CustodyCard | client/src/components/custody/CustodyCard.tsx | Custody info card |
| ReleaseCard | client/src/components/release/ReleaseCard.tsx | Release card |
| ConfirmRefundModal | client/src/components/release/ConfirmRefundModal.tsx | Confirm refund modal |
| ReleaseDecisionModal | client/src/components/release/ReleaseDecisionModal.tsx | Release decision modal |
| RequestReleaseModal | client/src/components/release/RequestReleaseModal.tsx | Request release modal |
| ScrutinyDecisionModal | client/src/components/scrutiny/ScrutinyDecisionModal.tsx | Scrutiny decision modal |
| LinkedInstrumentsCard | client/src/components/relationships/LinkedInstrumentsCard.tsx | Linked instruments |
| RenewReplaceModal | client/src/components/relationships/RenewReplaceModal.tsx | Renew/replace modal |
| AuditMetadataViewer | client/src/components/audit/AuditMetadataViewer.tsx | Audit metadata viewer |

## 3.7 Context, API, Types, Utils (VERIFIED)
| Module | Path | Purpose |
|--------|------|---------|
| AuthContext | client/src/context/AuthContext.tsx | Auth state/session management |
| API modules | client/src/api/*.ts | API clients (auth, instruments, dashboard, clearances, custody, documents, ocr, relationships, release, audit) |
| Types | client/src/types/*.ts | Type definitions (auth, instrument, dashboard, clearance, release, document, ocr, custody, relationship, audit) |
| Utils | client/src/utils/format.ts | Formatting helpers (formatINR, formatDate used in pages) |

**Note:** Props/states/interactions documented at high level from usage; detailed prop interfaces not exhaustively listed here - see source files if needed. All listed files exist (VERIFIED).
