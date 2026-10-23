import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";

const control =
  "block w-full h-11 rounded-lg border bg-surface text-[15px] text-ink placeholder:text-ink-subtle transition-colors duration-150 focus:outline-none focus:border-navy-700 focus:ring-2 focus:ring-navy-700/20 disabled:bg-muted disabled:text-ink-muted";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  srOnlyLabel?: boolean;
}

export function Field({ id, label, hint, error, children, srOnlyLabel }: FieldProps) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className={srOnlyLabel ? "sr-only" : "block text-sm font-medium text-ink mb-1.5"}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-start gap-1.5 text-[13px] text-danger break-words"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leadingIcon, trailing, className = "", ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`${control} ${leadingIcon ? "pl-10" : "pl-3"} ${trailing ? "pr-12" : "pr-3"} ${
          invalid ? "border-danger" : "border-line-strong"
        } ${className}`}
        {...rest}
      />
      {trailing && <span className="absolute inset-y-0 right-0 flex items-center">{trailing}</span>}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`${control} appearance-none border-line-strong pl-3 pr-10 ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    );
  },
);
