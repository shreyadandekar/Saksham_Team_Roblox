/**
 * src/api/audit.ts
 * Frontend API client and CSV exporter for Milestone 8: Audit & Reporting.
 */

import type {
  AuditEventItem,
  AuditFilterParams,
  AuditResponse,
} from "../types/audit";
import { getActionMeta } from "../types/audit";

/**
 * Fetch paginated, filtered audit events from GET /api/audit.
 * Tenancy and role isolation are strictly enforced on the server.
 */
export async function getAuditEvents(
  params?: AuditFilterParams
): Promise<AuditResponse> {
  const query = new URLSearchParams();

  if (params) {
    if (params.page !== undefined && params.page > 0) {
      query.set("page", String(params.page));
    }
    if (params.limit !== undefined && params.limit > 0) {
      query.set("limit", String(params.limit));
    }
    if (params.entityType) {
      query.set("entityType", params.entityType);
    }
    if (params.entityId && params.entityId.trim()) {
      query.set("entityId", params.entityId.trim());
    }
    if (params.action && params.action.trim()) {
      query.set("action", params.action.trim());
    }
    if (params.actorId && params.actorId.trim()) {
      query.set("actorId", params.actorId.trim());
    }
    if (params.from && params.from.trim()) {
      query.set("from", params.from.trim());
    }
    if (params.to && params.to.trim()) {
      query.set("to", params.to.trim());
    }
    if (params.institutionId && params.institutionId.trim()) {
      query.set("institutionId", params.institutionId.trim());
    }
  }

  const queryString = query.toString();
  const endpoint = queryString ? `/api/audit?${queryString}` : "/api/audit";

  const res = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch audit events (HTTP ${res.status})`
    );
  }

  return res.json();
}

/**
 * Format metadata object into a safe, human-readable summary for CSV export.
 * Excludes sensitive fields and internal paths.
 */
function formatMetadataForCsv(metadata?: Record<string, unknown> | null): string {
  if (!metadata || typeof metadata !== "object") return "";

  const sensitiveKeys = new Set([
    "storagePath",
    "password",
    "passwordHash",
    "token",
    "signedUrl",
    "secret",
  ]);

  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeys.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "object") {
      parts.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      parts.push(`${key}: ${String(value)}`);
    }
  }

  return parts.join("; ");
}

/**
 * Escape a single CSV cell, enclosing in double quotes and mitigating
 * formula injection (CSV injection) vulnerabilities in Excel/Calc.
 */
function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value).trim();

  // Formula injection mitigation: if the cell starts with formula characters,
  // prefix with a single quote so spreadsheets treat it as verbatim string.
  const formulaChars = ["=", "+", "-", "@", "\t", "\r"];
  if (formulaChars.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  // Escape internal quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Convert an array of audit events into CSV text.
 */
export function generateAuditCsv(events: AuditEventItem[]): string {
  const headers = [
    "Timestamp (UTC)",
    "Action",
    "Action Label",
    "Category",
    "Entity Type",
    "Entity ID",
    "Actor Name",
    "Actor Email",
    "Actor Role",
    "Details",
  ];

  const rows = events.map((event) => {
    const meta = getActionMeta(event.action);
    const details = formatMetadataForCsv(event.metadata);

    return [
      sanitizeCsvCell(event.createdAt),
      sanitizeCsvCell(event.action),
      sanitizeCsvCell(meta.label),
      sanitizeCsvCell(meta.categoryLabel),
      sanitizeCsvCell(event.entityType),
      sanitizeCsvCell(event.entityId),
      sanitizeCsvCell(event.actor?.fullName || "System"),
      sanitizeCsvCell(event.actor?.email || ""),
      sanitizeCsvCell(event.actor?.role || ""),
      sanitizeCsvCell(details),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Export audit events matching current filters as a CSV file.
 *
 * @param params Filter parameters
 * @param scope "page" exports current page only; "all" fetches all matching records safely.
 */
export async function exportAuditCsv(
  params: AuditFilterParams,
  scope: "page" | "all"
): Promise<{ count: number }> {
  let eventsToExport: AuditEventItem[] = [];

  if (scope === "page") {
    const response = await getAuditEvents(params);
    eventsToExport = response.events;
  } else {
    // "all" scope: fetch page by page safely up to a hard cap of 50 pages (5,000 records)
    const MAX_PAGES = 50;
    const PAGE_SIZE = 100;
    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= MAX_PAGES) {
      const response = await getAuditEvents({
        ...params,
        page: currentPage,
        limit: PAGE_SIZE,
      });

      eventsToExport.push(...response.events);

      if (!response.pagination.hasNext || currentPage >= response.pagination.totalPages) {
        hasMore = false;
      } else {
        currentPage += 1;
      }
    }
  }

  if (eventsToExport.length === 0) {
    throw new Error("No audit records found matching the specified criteria to export.");
  }

  // Prepend UTF-8 BOM so Microsoft Excel correctly displays Unicode characters
  const csvContent = "\uFEFF" + generateAuditCsv(eventsToExport);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `fdr-audit-log-${scope}-${timestamp}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: eventsToExport.length };
}
