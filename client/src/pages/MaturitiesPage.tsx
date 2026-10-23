/**
 * src/pages/MaturitiesPage.tsx
 * Open deposits grouped by how soon they mature.
 */

import { CalendarCheck2 } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { EmptyState, ErrorState, Skeleton } from "../components/ui/States";
import { InstrumentCardList, InstrumentTable } from "../components/instruments/InstrumentTable";
import { useAuth } from "../context/AuthContext";
import { useInstruments } from "../hooks/useInstruments";
import { isSystemWide } from "../lib/roles";
import { BUCKET_META, maturityBucket, sumAmount, type MaturityBucket } from "../lib/instruments";
import { formatINRCompact } from "../lib/format";

const BUCKETS: MaturityBucket[] = ["overdue", "within30", "within90", "within365", "later"];

const BUCKET_DOT: Record<MaturityBucket, string> = {
  overdue: "bg-danger",
  within30: "bg-warning",
  within90: "bg-saffron",
  within365: "bg-navy-700",
  later: "bg-ink-subtle",
  closed: "bg-line-strong",
};

export default function MaturitiesPage() {
  const { user } = useAuth();
  const { instruments, loading, error, reload } = useInstruments();
  const systemWide = isSystemWide(user?.role);

  const groups = BUCKETS.map((bucket) => ({
    bucket,
    rows: instruments
      .filter((i) => maturityBucket(i) === bucket)
      .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()),
  }));
  const openCount = groups.reduce((a, g) => a + g.rows.length, 0);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Maturities" }]}>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Monitoring"
          title="Maturities"
          description="Open deposits grouped by how soon they mature. Released and rejected FDRs are excluded."
        />

        {error && <ErrorState message={error} onRetry={reload} />}

        {loading ? (
          <div className="flex flex-col gap-4" role="status" aria-label="Loading maturities">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <nav aria-label="Maturity groups">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {groups.map(({ bucket, rows }) => (
                  <li key={bucket}>
                    <a
                      href={`#bucket-${bucket}`}
                      className="block h-full rounded-[var(--radius-card)] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] hover:border-line-strong"
                    >
                      <span className="flex items-center gap-2 text-[13px] text-ink-muted">
                        <span className={`h-2 w-2 rounded-full ${BUCKET_DOT[bucket]}`} aria-hidden="true" />
                        {BUCKET_META[bucket].label}
                      </span>
                      <span className="mt-1 block text-xl font-semibold text-navy-900 tabular-nums">{rows.length}</span>
                      <span className="block text-[12px] text-ink-muted tabular-nums">{formatINRCompact(sumAmount(rows))}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {openCount === 0 ? (
              <Card>
                <EmptyState icon={CalendarCheck2} title="No open deposits" description="There are no active or pending FDRs to monitor." />
              </Card>
            ) : (
              groups
                .filter((g) => g.rows.length > 0)
                .map(({ bucket, rows }) => (
                  <section key={bucket} id={`bucket-${bucket}`} aria-labelledby={`bucket-${bucket}-heading`} className="scroll-mt-24">
                    <Card>
                      <CardHeader
                        id={`bucket-${bucket}-heading`}
                        title={`${BUCKET_META[bucket].label} (${rows.length})`}
                        description={BUCKET_META[bucket].description}
                      />
                      <InstrumentTable rows={rows} showInstitution={systemWide} />
                      <InstrumentCardList rows={rows} showInstitution={systemWide} />
                    </Card>
                  </section>
                ))
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
