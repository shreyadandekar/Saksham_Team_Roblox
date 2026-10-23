import {
  CheckCircle2,
  CircleDashed,
  Clock,
  FileSearch,
  FileWarning,
  Hourglass,
  Send,
  Unlock,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "accent";

export interface StatusMeta {
  label: string;
  tone: Tone;
  icon: LucideIcon;
  description: string;
  chartColor: string;
}

export const STATUS_ORDER = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_SCRUTINY",
  "CORRECTION_REQUIRED",
  "ACTIVE",
  "REJECTED",
  "MATURED",
  "RELEASE_REQUESTED",
  "RELEASED",
] as const;

export type InstrumentStatus = (typeof STATUS_ORDER)[number];

export const STATUS_META: Record<InstrumentStatus, StatusMeta> = {
  DRAFT: {
    label: "Draft",
    tone: "neutral",
    icon: CircleDashed,
    description: "Being prepared by the institution. Not yet submitted.",
    chartColor: "#8a95a5",
  },
  SUBMITTED: {
    label: "Submitted",
    tone: "info",
    icon: Send,
    description: "Submitted by the institution and awaiting scrutiny.",
    chartColor: "#3b6fb0",
  },
  UNDER_SCRUTINY: {
    label: "Under scrutiny",
    tone: "info",
    icon: FileSearch,
    description: "Being reviewed by an AICTE officer.",
    chartColor: "#17365d",
  },
  CORRECTION_REQUIRED: {
    label: "Correction required",
    tone: "warning",
    icon: FileWarning,
    description: "Returned to the institution for corrections.",
    chartColor: "#e89b36",
  },
  ACTIVE: {
    label: "Active",
    tone: "success",
    icon: CheckCircle2,
    description: "Verified and held as an active security deposit.",
    chartColor: "#27835b",
  },
  REJECTED: {
    label: "Rejected",
    tone: "danger",
    icon: XCircle,
    description: "Rejected during scrutiny.",
    chartColor: "#b42318",
  },
  MATURED: {
    label: "Matured",
    tone: "accent",
    icon: Hourglass,
    description: "Reached its maturity date.",
    chartColor: "#9a6a1f",
  },
  RELEASE_REQUESTED: {
    label: "Release requested",
    tone: "warning",
    icon: Clock,
    description: "The institution has requested release of the deposit.",
    chartColor: "#c27a1a",
  },
  RELEASED: {
    label: "Released",
    tone: "neutral",
    icon: Unlock,
    description: "Released back to the institution. Lifecycle complete.",
    chartColor: "#5b6b7e",
  },
};

export function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status as InstrumentStatus] ?? {
      label: status.replace(/_/g, " ").toLowerCase(),
      tone: "neutral",
      icon: CircleDashed,
      description: "Status not recognised by this version of the portal.",
      chartColor: "#8a95a5",
    }
  );
}

/** Statuses where the deposit is no longer held, so maturity urgency does not apply. */
export const CLOSED_STATUSES: string[] = ["RELEASED", "REJECTED"];

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted text-ink-muted border-line",
  info: "bg-info-soft text-info border-info/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  success: "bg-success-soft text-success border-success/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  accent: "bg-saffron-soft text-[#7a4a0c] border-saffron/40",
};
