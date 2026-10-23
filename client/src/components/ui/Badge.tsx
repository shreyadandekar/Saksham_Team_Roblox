import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TONE_CLASSES, getStatusMeta, type Tone } from "../../lib/status";

interface BadgeProps {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", icon: Icon, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const meta = getStatusMeta(status);
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}
