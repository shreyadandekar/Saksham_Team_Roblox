import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] sm:text-2xl font-semibold text-navy-900 leading-tight text-balance break-words">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-ink-muted leading-relaxed max-w-2xl text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
