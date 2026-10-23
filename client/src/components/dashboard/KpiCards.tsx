import { Link } from "react-router-dom";
import { AlertCircle, CalendarClock, CheckCircle2, FileStack, type LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/States";

export interface Kpi {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  to: string;
  accent: "navy" | "green" | "saffron" | "danger";
}

const ACCENT: Record<Kpi["accent"], string> = {
  navy: "bg-navy-50 text-navy-800",
  green: "bg-success-soft text-success",
  saffron: "bg-saffron-soft text-[#7a4a0c]",
  danger: "bg-danger-soft text-danger",
};

export const KPI_ICONS = { FileStack, CheckCircle2, AlertCircle, CalendarClock };

export function KpiCards({ items, loading }: { items: Kpi[]; loading: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(loading ? Array.from({ length: 4 }) : items).map((item, idx) => (
        <li key={loading ? idx : (item as Kpi).label} className="min-w-0">
          {loading ? (
            <Card className="p-4 sm:p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-7 w-20" />
              <Skeleton className="mt-2 h-3.5 w-36" />
            </Card>
          ) : (
            <KpiCard {...(item as Kpi)} />
          )}
        </li>
      ))}
    </ul>
  );
}

function KpiCard({ label, value, detail, icon: Icon, to, accent }: Kpi) {
  return (
    <Link
      to={to}
      className="group block h-full rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5 shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-line-strong hover:bg-navy-50/40"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-muted">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENT[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-1 block text-2xl font-semibold text-navy-900 tabular-nums">{value}</span>
      <span className="mt-1 block text-[13px] text-ink-muted group-hover:text-ink">{detail}</span>
    </Link>
  );
}
