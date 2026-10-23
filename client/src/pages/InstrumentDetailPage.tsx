/**
 * src/pages/InstrumentDetailPage.tsx
 * Read-only view of a single FDR. Uses the list from GET /api/instruments,
 * as the server has no single-instrument endpoint yet.
 */

import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, FileQuestion, Paperclip, PencilLine, ScrollText, Undo2 } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState, ErrorState, Skeleton, UnavailableNotice } from "../components/ui/States";
import { LifecycleTracker } from "../components/instruments/LifecycleTracker";
import { MaturityIndicator } from "../components/instruments/MaturityIndicator";
import { useAuth } from "../context/AuthContext";
import { useInstruments } from "../hooks/useInstruments";
import { getStatusMeta } from "../lib/status";
import { formatDate, formatINR, tenureLabel } from "../lib/format";
import { isSystemWide } from "../lib/roles";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-ink-muted sm:w-44 shrink-0">{label}</dt>
      <dd className="text-sm text-ink min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function InstrumentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { instruments, loading, error, reload } = useInstruments();
  const instrument = instruments.find((i) => i.id === id);
  const systemWide = isSystemWide(user?.role);

  const crumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "FDR Registry", to: "/instruments" },
    { label: instrument?.instrumentNumber ?? "Record" },
  ];

  if (loading) {
    return (
      <AppShell breadcrumbs={crumbs}>
        <div className="flex flex-col gap-6" role="status" aria-label="Loading record">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell breadcrumbs={crumbs}>
        <ErrorState message={error} onRetry={reload} />
      </AppShell>
    );
  }

  if (!instrument) {
    return (
      <AppShell breadcrumbs={crumbs}>
        <Card>
          <EmptyState
            icon={FileQuestion}
            title="Record not found"
            description="This FDR does not exist, or it is outside the records your role can view."
            action={<ButtonLink to="/instruments" variant="secondary">Back to registry</ButtonLink>}
          />
        </Card>
      </AppShell>
    );
  }

  const meta = getStatusMeta(instrument.status);

  return (
    <AppShell breadcrumbs={crumbs}>
      <div className="flex flex-col gap-6">
        <div>
          <ButtonLink to="/instruments" variant="ghost" size="sm" className="-ml-2 mb-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to registry
          </ButtonLink>
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Fixed Deposit Receipt</p>
                <h1 className="mt-1 text-[22px] sm:text-2xl font-semibold text-navy-900 break-all">{instrument.instrumentNumber}</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {instrument.bankName} · {instrument.branchName}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={instrument.status} />
                  <span className="text-[13px] text-ink-muted">{meta.description}</span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 lg:text-right lg:min-w-[280px]">
                <div>
                  <dt className="text-[12px] uppercase tracking-wide text-ink-subtle">Deposit amount</dt>
                  <dd className="mt-0.5 text-xl font-semibold text-navy-900 tabular-nums">{formatINR(instrument.amount)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase tracking-wide text-ink-subtle">Maturity</dt>
                  <dd className="mt-0.5 flex lg:justify-end">
                    <MaturityIndicator maturityDate={instrument.maturityDate} status={instrument.status} />
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Lifecycle stage" />
          <CardBody>
            <LifecycleTracker status={instrument.status} />
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-6 min-w-0">
            <Card>
              <CardHeader title="Deposit details" />
              <CardBody>
                <dl className="divide-y divide-line">
                  <DetailRow label="FDR number"><span className="font-medium">{instrument.instrumentNumber}</span></DetailRow>
                  <DetailRow label="Issuing bank">{instrument.bankName}</DetailRow>
                  <DetailRow label="Branch">{instrument.branchName}</DetailRow>
                  <DetailRow label="Amount"><span className="tabular-nums">{formatINR(instrument.amount)}</span></DetailRow>
                  <DetailRow label="Issue date">{formatDate(instrument.issueDate)}</DetailRow>
                  <DetailRow label="Maturity date">{formatDate(instrument.maturityDate)}</DetailRow>
                  <DetailRow label="Tenure">{tenureLabel(instrument.issueDate, instrument.maturityDate)}</DetailRow>
                  <DetailRow label="Favouring">{instrument.favouringDetails}</DetailRow>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Institution" />
              <CardBody>
                <dl className="divide-y divide-line">
                  <DetailRow label="Name">{instrument.institution?.name ?? "Not provided"}</DetailRow>
                  <DetailRow label="AICTE code">{instrument.institution?.code ?? "Not provided"}</DetailRow>
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Record" />
              <CardBody>
                <dl className="divide-y divide-line">
                  <DetailRow label="Created">{formatDate(instrument.createdAt)}</DetailRow>
                  <DetailRow label="Last updated">{formatDate(instrument.updatedAt)}</DetailRow>
                </dl>
              </CardBody>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader title="Actions and documents" description="These features are not yet available." />
            <CardBody className="flex flex-col gap-3">
              {user?.role === "INSTITUTION_USER" && (
                <UnavailableNotice icon={PencilLine} title="Edit or correct this FDR">
                  Requires an update instrument endpoint.
                </UnavailableNotice>
              )}
              <UnavailableNotice icon={Paperclip} title="Supporting documents">
                Requires document upload and retrieval endpoints.
              </UnavailableNotice>
              {systemWide && (
                <UnavailableNotice icon={ClipboardCheck} title="Scrutiny decision">
                  Requires scrutiny action endpoints to approve, reject or request corrections.
                </UnavailableNotice>
              )}
              <UnavailableNotice icon={Undo2} title="Release request">
                Requires release request endpoints.
              </UnavailableNotice>
              <UnavailableNotice icon={ScrollText} title="Audit history">
                Requires an audit events endpoint for this record.
              </UnavailableNotice>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
