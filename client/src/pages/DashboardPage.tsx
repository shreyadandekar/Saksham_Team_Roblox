/**
 * src/pages/DashboardPage.tsx
 * Role-aware overview built from GET /api/instruments.
 */

import { AlertCircle, CalendarClock, CheckCircle2, FileStack } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { PageHeader } from "../components/ui/PageHeader";
import { ButtonLink } from "../components/ui/Button";
import { ErrorState } from "../components/ui/States";
import { KpiCards, type Kpi } from "../components/dashboard/KpiCards";
import { StatusDistributionChart } from "../components/dashboard/StatusDistributionChart";
import { MaturityTimelineChart } from "../components/dashboard/MaturityTimelineChart";
import { UpcomingMaturities } from "../components/dashboard/UpcomingMaturities";
import { useAuth } from "../context/AuthContext";
import { useInstruments } from "../hooks/useInstruments";
import { ROLE_SCOPE, isSystemWide } from "../lib/roles";
import { formatINRCompact } from "../lib/format";
import { maturityBucket, sumAmount } from "../lib/instruments";

export default function DashboardPage() {
  const { user } = useAuth();
  const { instruments, loading, error, reload } = useInstruments();
  const systemWide = isSystemWide(user?.role);

  const active = instruments.filter((i) => i.status === "ACTIVE");
  const attention = instruments.filter((i) =>
    systemWide
      ? ["SUBMITTED", "UNDER_SCRUTINY", "RELEASE_REQUESTED"].includes(i.status)
      : ["CORRECTION_REQUIRED", "DRAFT"].includes(i.status),
  );
  const dueSoon = instruments.filter((i) => ["overdue", "within30", "within90"].includes(maturityBucket(i)));
  const institutions = new Set(instruments.map((i) => i.institutionId)).size;

  const kpis: Kpi[] = [
    {
      label: "Total FDRs",
      value: String(instruments.length),
      detail: systemWide
        ? `${formatINRCompact(sumAmount(instruments))} across ${institutions} institution${institutions === 1 ? "" : "s"}`
        : `${formatINRCompact(sumAmount(instruments))} lodged in total`,
      icon: FileStack,
      to: "/instruments",
      accent: "navy",
    },
    {
      label: "Active deposits",
      value: String(active.length),
      detail: `${formatINRCompact(sumAmount(active))} currently held`,
      icon: CheckCircle2,
      to: "/instruments?status=ACTIVE",
      accent: "green",
    },
    {
      label: systemWide ? "Awaiting officer action" : "Needs your action",
      value: String(attention.length),
      detail: systemWide ? "Submitted, in scrutiny or release requested" : "Drafts and corrections requested",
      icon: AlertCircle,
      to: "/instruments?view=attention",
      accent: attention.length > 0 ? "saffron" : "navy",
    },
    {
      label: "Due within 90 days",
      value: String(dueSoon.length),
      detail: `${formatINRCompact(sumAmount(dueSoon))} at or near maturity`,
      icon: CalendarClock,
      to: "/maturities",
      accent: dueSoon.some((i) => maturityBucket(i) === "overdue") ? "danger" : "saffron",
    },
  ];

  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Overview"
          title={`Welcome, ${firstName}`}
          description={user ? ROLE_SCOPE[user.role] : undefined}
          actions={
            <ButtonLink to="/instruments" variant="secondary">
              <FileStack className="h-4 w-4" aria-hidden="true" />
              Open FDR registry
            </ButtonLink>
          }
        />

        {error && <ErrorState message={error} onRetry={reload} />}

        <section aria-label="Key figures">
          <KpiCards items={kpis} loading={loading} />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <StatusDistributionChart instruments={instruments} loading={loading} />
          <MaturityTimelineChart instruments={instruments} loading={loading} />
        </div>

        <UpcomingMaturities instruments={instruments} loading={loading} showInstitution={systemWide} />
      </div>
    </AppShell>
  );
}
