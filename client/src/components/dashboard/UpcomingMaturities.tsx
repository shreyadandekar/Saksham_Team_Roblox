import { Link } from "react-router-dom";
import { CalendarCheck2 } from "lucide-react";
import type { InstrumentSummary } from "../../types/auth";
import { CLOSED_STATUSES } from "../../lib/status";
import { daysUntil, formatINR } from "../../lib/format";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState, Skeleton } from "../ui/States";
import { StatusBadge } from "../ui/Badge";
import { MaturityIndicator } from "../instruments/MaturityIndicator";

interface Props {
  instruments: InstrumentSummary[];
  loading: boolean;
  showInstitution: boolean;
}

export function UpcomingMaturities({ instruments, loading, showInstitution }: Props) {
  const upcoming = instruments
    .filter((i) => !CLOSED_STATUSES.includes(i.status) && daysUntil(i.maturityDate) <= 90)
    .sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
    .slice(0, 6);

  return (
    <Card>
      <CardHeader
        title="Due within 90 days"
        description="Open deposits at or near maturity, soonest first."
        action={
          <Link to="/maturities" className="text-[13px] font-medium text-navy-800 hover:underline">
            View all maturities
          </Link>
        }
      />
      {loading ? (
        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarCheck2}
          title="Nothing due in the next 90 days"
          description="No open deposits are at or near maturity."
        />
      ) : (
        <ul className="divide-y divide-line">
          {upcoming.map((i) => (
            <li key={i.id}>
              <Link
                to={`/instruments/${i.id}`}
                className="flex flex-col gap-2 px-4 py-3 sm:px-5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/60 transition-colors duration-150"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-navy-900 truncate">{i.instrumentNumber}</span>
                  <span className="block text-[13px] text-ink-muted truncate">
                    {showInstitution && i.institution ? `${i.institution.name} · ` : ""}
                    {i.bankName}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-sm font-medium text-ink tabular-nums">{formatINR(i.amount)}</span>
                  <StatusBadge status={i.status} />
                  <span className="w-28 text-right">
                    <MaturityIndicator maturityDate={i.maturityDate} status={i.status} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
