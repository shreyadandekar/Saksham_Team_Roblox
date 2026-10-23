import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RotateCw, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center px-4 py-10">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-ink-muted">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 text-[13px] text-ink-muted max-w-sm text-pretty">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Could not load data",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-[var(--radius-card)] border border-danger/25 bg-danger-soft p-4"
    >
      <AlertTriangle className="h-5 w-5 text-danger shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-danger">{title}</p>
        <p className="text-[13px] text-ink mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}

interface NoticeProps {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
}

/** Neutral explanation box for features waiting on backend support. */
export function UnavailableNotice({ icon: Icon = Inbox, title, children }: NoticeProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-dashed border-line-strong bg-muted/60 p-4">
      <Icon className="h-5 w-5 text-ink-muted shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="text-[13px] text-ink-muted mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
