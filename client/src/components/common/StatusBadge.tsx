/**
 * src/components/common/StatusBadge.tsx
 * Standardized status badge for FDR lifecycle states matching government portal styling.
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
      styles: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
      dot: "bg-[#64748B]",
    },
    SUBMITTED: {
      label: "Submitted",
      styles: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
      dot: "bg-[#2563EB]",
    },
    UNDER_SCRUTINY: {
      label: "Under Scrutiny",
      styles: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
      dot: "bg-[#D97706]",
    },
    CORRECTION_REQUIRED: {
      label: "Correction Required",
      styles: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
      dot: "bg-[#DC2626]",
    },
    ACTIVE: {
      label: "Active Deposit",
      styles: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
      dot: "bg-[#16A34A]",
    },
    REJECTED: {
      label: "Rejected",
      styles: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
      dot: "bg-[#DC2626]",
    },
    MATURED: {
      label: "Matured",
      styles: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]",
      dot: "bg-[#B91C1C]",
    },
    RELEASE_REQUESTED: {
      label: "Release Requested",
      styles: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
      dot: "bg-[#D97706]",
    },
    RELEASED: {
      label: "Released / Discharged",
      styles: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]",
      dot: "bg-[#16A34A]",
    },
  };

  const config = configs[status] || {
    label: (status as string).replace(/_/g, " "),
    styles: "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]",
    dot: "bg-[#64748B]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.styles} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
