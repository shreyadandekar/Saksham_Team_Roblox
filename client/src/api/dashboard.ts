/**
 * src/api/dashboard.ts
 * Frontend API client for live database-backed dashboard metrics and monitoring.
 */

import type {
  DashboardMetricsResponse,
  ScoredInstrumentSummary,
  PriorityDistribution,
} from "../types/dashboard";

/**
 * Normalizes an individual scored instrument item, ensuring that
 * both nested `attention` properties and flat fallback fields are always valid.
 */
export function normalizeScoredInstrument(raw: any): ScoredInstrumentSummary {
  const priorityBand =
    raw?.attention?.priorityBand ||
    raw?.priorityBand ||
    "LOW";

  const daysRemaining =
    typeof raw?.attention?.daysRemaining === "number"
      ? raw.attention.daysRemaining
      : typeof raw?.daysToMaturity === "number"
        ? raw.daysToMaturity
        : 0;

  const finalScore =
    typeof raw?.attention?.finalScore === "number"
      ? raw.attention.finalScore
      : typeof raw?.attentionScore === "number"
        ? raw.attentionScore
        : 0;

  const explanation =
    raw?.attention?.explanation ||
    raw?.explanation ||
    "Standard monitoring active";

  const instName =
    raw?.institution?.name ||
    raw?.institutionName ||
    "—";

  const instCode =
    raw?.institution?.code ||
    raw?.institutionCode ||
    "";

  return {
    id: String(raw?.id || ""),
    instrumentNumber: String(raw?.instrumentNumber || "—"),
    bankName: String(raw?.bankName || "—"),
    branchName: raw?.branchName || "",
    amount: raw?.amount ?? 0,
    maturityDate: String(raw?.maturityDate || ""),
    status: String(raw?.status || "ACTIVE"),
    institution: {
      name: instName,
      code: instCode,
    },
    institutionName: instName,
    institutionCode: instCode,
    attention: {
      daysRemaining,
      condition: raw?.attention?.condition || "STANDARD",
      reminderWindow: raw?.attention?.reminderWindow || null,
      urgencyContribution: raw?.attention?.urgencyContribution || 0,
      additionalConditions: Array.isArray(raw?.attention?.additionalConditions)
        ? raw.attention.additionalConditions
        : [],
      finalScore,
      priorityBand,
      explanation,
    },
    attentionScore: finalScore,
    priorityBand,
    daysToMaturity: daysRemaining,
    explanation,
  };
}

/**
 * Normalizes the full dashboard metrics response, ensuring that counts,
 * priority distribution, and scored lists are guaranteed non-null and correctly shaped.
 */
export function normalizeDashboardMetrics(raw: any): DashboardMetricsResponse {
  const rawCounts = raw?.counts || raw?.metrics || {};
  const rawPriority = raw?.priorityDistribution || {};

  const counts = {
    total: rawCounts.total ?? rawCounts.totalInstruments ?? 0,
    active: rawCounts.active ?? rawCounts.activeInstruments ?? 0,
    underScrutiny: rawCounts.underScrutiny ?? rawCounts.underScrutinyCount ?? 0,
    submitted: rawCounts.submitted ?? rawCounts.submittedCount ?? 0,
    drafts: rawCounts.drafts ?? rawCounts.draftCount ?? 0,
    upcomingMaturities: rawCounts.upcomingMaturities ?? rawCounts.upcomingMaturitiesCount ?? 0,
    maturedOrOverdue: rawCounts.maturedOrOverdue ?? rawCounts.maturedOrOverdueCount ?? 0,
    openDiscrepancies: rawCounts.openDiscrepancies ?? rawCounts.openDiscrepanciesCount ?? 0,
    pendingReleaseRequests: rawCounts.pendingReleaseRequests ?? rawCounts.pendingReleaseCount ?? 0,
  };

  const priorityDistribution: PriorityDistribution = {
    critical: rawPriority.critical ?? rawPriority.CRITICAL ?? 0,
    high: rawPriority.high ?? rawPriority.HIGH ?? 0,
    medium: rawPriority.medium ?? rawPriority.MEDIUM ?? 0,
    low: rawPriority.low ?? rawPriority.LOW ?? 0,
  };

  const topPriorityInstruments = Array.isArray(raw?.topPriorityInstruments)
    ? raw.topPriorityInstruments.map(normalizeScoredInstrument)
    : [];

  const upcomingMaturities = Array.isArray(raw?.upcomingMaturities)
    ? raw.upcomingMaturities.map(normalizeScoredInstrument)
    : [];

  return {
    success: raw?.success ?? true,
    role: raw?.role ?? "",
    institutionId: raw?.institutionId ?? null,
    counts,
    metrics: raw?.metrics,
    priorityDistribution,
    topPriorityInstruments,
    upcomingMaturities,
  };
}

/**
 * Fetch real database-backed dashboard metrics, priority distribution, and scored instruments.
 */
export async function getDashboardMetrics(): Promise<DashboardMetricsResponse> {
  const res = await fetch("/api/dashboard/metrics", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch dashboard metrics (HTTP ${res.status})`);
  }

  const data = await res.json();
  return normalizeDashboardMetrics(data);
}

