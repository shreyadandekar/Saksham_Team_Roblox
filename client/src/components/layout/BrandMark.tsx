import { ShieldCheck } from "lucide-react";

interface BrandMarkProps {
  inverted?: boolean;
  compact?: boolean;
}

export function BrandMark({ inverted = false, compact = false }: BrandMarkProps) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          inverted ? "bg-white/10 text-white" : "bg-navy-900 text-white"
        }`}
      >
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col min-w-0 leading-tight">
        <span
          className={`text-[15px] font-semibold tracking-tight truncate ${
            inverted ? "text-white" : "text-navy-900"
          }`}
        >
          FDR Sentinel
        </span>
        {!compact && (
          <span
            className={`text-[11px] truncate ${inverted ? "text-white/70" : "text-ink-muted"}`}
          >
            Security Deposit Management
          </span>
        )}
      </span>
    </span>
  );
}
