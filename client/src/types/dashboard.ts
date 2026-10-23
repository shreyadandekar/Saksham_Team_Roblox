/**
 * src/types/dashboard.ts
 * Type definitions for the live database-backed dashboard metrics and Attention Priority scoring.
 */

export interface PriorityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AttentionScoreCondition {
  condition: string;
  points: number;
}

export interface AttentionScoreDetails {
  daysRemaining: number;
  condition: string;
  reminderWindow: string | null;
  urgencyContribution: number;
  additionalConditions: AttentionScoreCondition[];
  finalScore: number;
  priorityBand: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
}

export interface ScoredInstrumentSummary {
  id: string;
  instrumentNumber: string;
  bankName: string;
  branchName?: string;
  amount: number | string;
  maturityDate: string;
  status: string;
  institution?: {
    id?: string;
    name: string;
    code: string;
  };
  institutionName?: string;
  institutionCode?: string;
  attention?: AttentionScoreDetails;
  attentionScore?: number;
  priorityBand?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  daysToMaturity?: number;
  explanation?: string;
}

export interface DashboardMetricsResponse {
  success: boolean;
  role: string;
  institutionId: string | null;
  counts: {
    total: number;
    active: number;
    underScrutiny: number;
    submitted: number;
    drafts: number;
    upcomingMaturities: number;
    maturedOrOverdue: number;
    openDiscrepancies: number;
    pendingReleaseRequests: number;
  };
  metrics?: {
    totalInstruments?: number;
    activeInstruments?: number;
    underScrutinyCount?: number;
    submittedCount?: number;
    activeReviewCount?: number;
    draftCount?: number;
    pendingReleaseCount?: number;
    releasedCount?: number;
    maturedOrOverdueCount?: number;
    upcomingMaturitiesCount?: number;
    openDiscrepanciesCount?: number;
  };
  priorityDistribution: PriorityDistribution;
  topPriorityInstruments: ScoredInstrumentSummary[];
  upcomingMaturities: ScoredInstrumentSummary[];
}

