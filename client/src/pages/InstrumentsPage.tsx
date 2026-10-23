/**
 * src/pages/InstrumentsPage.tsx
 * FDR registry: search, filters, sorting and pagination over GET /api/instruments.
 * Filter state lives in the URL so links and back navigation preserve it.
 */

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FilePlus2, SearchX, X } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { Pagination } from "../components/ui/Pagination";
import { InstrumentFilters, SORT_OPTIONS, type FilterValues, type SortValue } from "../components/instruments/InstrumentFilters";
import { InstrumentCardList, InstrumentTable } from "../components/instruments/InstrumentTable";
import { useAuth } from "../context/AuthContext";
import { useInstruments } from "../hooks/useInstruments";
import { isSystemWide } from "../lib/roles";
import { toAmount } from "../lib/format";
import type { InstrumentSummary } from "../types/auth";

const PAGE_SIZE = 10;
const OFFICER_ATTENTION = ["SUBMITTED", "UNDER_SCRUTINY", "RELEASE_REQUESTED"];
const INSTITUTION_ATTENTION = ["CORRECTION_REQUIRED", "DRAFT"];

function compare(sort: SortValue) {
  return (a: InstrumentSummary, b: InstrumentSummary) => {
    switch (sort) {
      case "maturity-desc":
        return new Date(b.maturityDate).getTime() - new Date(a.maturityDate).getTime();
      case "amount-desc":
        return toAmount(b.amount) - toAmount(a.amount);
      case "amount-asc":
        return toAmount(a.amount) - toAmount(b.amount);
      case "issue-desc":
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
      default:
        return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
    }
  };
}

export default function InstrumentsPage() {
  const { user } = useAuth();
  const { instruments, loading, error, reload } = useInstruments();
  const [params, setParams] = useSearchParams();
  const systemWide = isSystemWide(user?.role);

  const sortParam = params.get("sort");
  const values: FilterValues = {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "",
    bank: params.get("bank") ?? "",
    inst: params.get("inst") ?? "",
    sort: (SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : "maturity-asc") as SortValue,
  };
  const attentionView = params.get("view") === "attention";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const banks = useMemo(() => [...new Set(instruments.map((i) => i.bankName))].sort(), [instruments]);
  const institutions = useMemo(() => {
    const map = new Map<string, string>();
    instruments.forEach((i) => i.institution && map.set(i.institution.id, i.institution.name));
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [instruments]);

  const filtered = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    const attention = systemWide ? OFFICER_ATTENTION : INSTITUTION_ATTENTION;
    return instruments
      .filter((i) => (attentionView ? attention.includes(i.status) : true))
      .filter((i) => (values.status ? i.status === values.status : true))
      .filter((i) => (values.bank ? i.bankName === values.bank : true))
      .filter((i) => (values.inst ? i.institutionId === values.inst : true))
      .filter((i) =>
        q
          ? [i.instrumentNumber, i.bankName, i.branchName, i.favouringDetails, i.institution?.name ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true,
      )
      .sort(compare(values.sort));
  }, [instruments, values.q, values.status, values.bank, values.inst, values.sort, attentionView, systemWide]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function update(patch: Partial<FilterValues> & { page?: number; view?: string | null }) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === "" || value === null || value === undefined || (key === "sort" && value === "maturity-asc") || (key === "page" && value === 1)) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  }

  const hasActiveFilters = !!(values.q || values.status || values.bank || values.inst || attentionView);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "FDR Registry" }]}>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Records"
          title="FDR Registry"
          description={
            systemWide
              ? "Every Fixed Deposit Receipt lodged by institutions across the system."
              : "Fixed Deposit Receipts lodged by your institution."
          }
          actions={
            user?.role === "INSTITUTION_USER" ? (
              <Button variant="secondary" disabled aria-describedby="register-unavailable">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                Register FDR
                <span id="register-unavailable" className="sr-only">Not yet available. Requires create instrument endpoint.</span>
              </Button>
            ) : undefined
          }
        />
        {user?.role === "INSTITUTION_USER" && (
          <p className="-mt-3 text-[13px] text-ink-muted">
            Registering new FDRs is not yet available. It needs create and update endpoints on the server.
          </p>
        )}

        {error && <ErrorState message={error} onRetry={reload} />}

        <Card>
          <div className="p-4 sm:p-5 border-b border-line">
            <InstrumentFilters
              values={values}
              banks={banks}
              institutions={institutions}
              showInstitution={systemWide}
              onChange={update}
              onReset={() => setParams({}, { replace: true })}
              hasActiveFilters={hasActiveFilters}
            />
            {attentionView && (
              <div className="mt-3">
                <Badge tone="accent">
                  {systemWide ? "Awaiting officer action" : "Needs your action"}
                  <button
                    type="button"
                    onClick={() => update({ view: null })}
                    className="ml-1 -mr-1 rounded p-0.5 hover:bg-black/5"
                    aria-label="Remove action-needed filter"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-4 sm:p-5 flex flex-col gap-3" role="status" aria-label="Loading records">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={instruments.length === 0 ? "No FDRs on file" : "No records match these filters"}
              description={
                instruments.length === 0
                  ? "Records will appear here once FDRs are lodged."
                  : "Try a different search term or clear the filters."
              }
              action={
                hasActiveFilters ? (
                  <Button variant="secondary" size="sm" onClick={() => setParams({}, { replace: true })}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <InstrumentTable rows={rows} showInstitution={systemWide} />
              <InstrumentCardList rows={rows} showInstitution={systemWide} />
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={(p) => {
                  update({ page: p });
                  document.getElementById("main-content")?.scrollIntoView({ block: "start" });
                }}
              />
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
