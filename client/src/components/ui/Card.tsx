import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-line rounded-[var(--radius-card)] shadow-[var(--shadow-card)] min-w-0 ${className}`}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
}

export function CardHeader({ title, description, action, id }: CardHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5 border-b border-line">
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold text-navy-900 leading-snug">
          {title}
        </h2>
        {description && (
          <p className="text-[13px] text-ink-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 sm:p-5 ${className}`} {...rest} />;
}
