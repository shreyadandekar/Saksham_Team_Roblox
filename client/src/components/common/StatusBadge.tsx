/**
 * src/components/common/StatusBadge.tsx
 * Standardized status badge for FDR lifecycle states.
 */

import type { InstrumentStatus } from "../../types/instrument";

interface StatusBadgeProps {
  status: InstrumentStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const configs: Record<
    InstrumentStatus,
    { label: string; styles: string; dot: string }
  > = {
    DRAFT: {
      label: "Draft",
      styles: "bg-slate-100 text-slate-700 border-slate-300",
      dot: "bg-slate-400",
    },
    SUBMITTED: {
      label: "Submitted",
      styles: "bg-sky-50 text-sky-800 border-sky-300",
      dot: "bg-sky-500",
    },
    UNDER_SCRUTINY: {
      label: "Under Scrutiny",
      styles: "bg-amber-50 text-amber-800 border-amber-300",
      dot: "bg-amber-500",
    },
    CORRECTION_REQUIRED: {
      label: "Correction Required",
      styles: "bg-rose-50 text-rose-800 border-rose-300",
      dot: "bg-rose-500",
    },
    ACTIVE: {
      label: "Active Deposit",
      styles: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dot: "bg-emerald-500",
    },
    REJECTED: {
      label: "Rejected",
      styles: "bg-red-50 text-red-800 border-red-300",
      dot: "bg-red-500",
    },
    MATURED: {
      label: "Matured",
      styles: "bg-indigo-50 text-indigo-800 border-indigo-300",
      dot: "bg-indigo-500",
    },
    RELEASE_REQUESTED: {
      label: "Release Requested",
      styles: "bg-purple-50 text-purple-800 border-purple-300",
      dot: "bg-purple-500",
    },
    RELEASED: {
      label: "Released",
      styles: "bg-zinc-100 text-zinc-700 border-zinc-300",
      dot: "bg-zinc-400",
    },
  };

  const config = configs[status] || {
    label: status,
    styles: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.styles} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
