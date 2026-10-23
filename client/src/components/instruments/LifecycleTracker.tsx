import { Check } from "lucide-react";
import { getStatusMeta } from "../../lib/status";

const MAIN_PATH = ["DRAFT", "SUBMITTED", "UNDER_SCRUTINY", "ACTIVE", "MATURED", "RELEASE_REQUESTED", "RELEASED"];

/** Position on the standard lifecycle path. Derived from the current status only, not history. */
function stepIndex(status: string): number {
  if (status === "CORRECTION_REQUIRED") return MAIN_PATH.indexOf("UNDER_SCRUTINY");
  if (status === "REJECTED") return MAIN_PATH.indexOf("UNDER_SCRUTINY");
  return MAIN_PATH.indexOf(status);
}

export function LifecycleTracker({ status }: { status: string }) {
  const current = stepIndex(status);
  const branch = status === "CORRECTION_REQUIRED" || status === "REJECTED" ? getStatusMeta(status) : null;

  return (
    <div>
      <ol className="flex flex-col gap-0 sm:flex-row sm:gap-0">
        {MAIN_PATH.map((s, idx) => {
          const done = idx < current;
          const isCurrent = idx === current;
          const meta = getStatusMeta(s);
          return (
            <li key={s} className="relative flex sm:flex-1 sm:flex-col items-start sm:items-center gap-3 sm:gap-2 pb-4 sm:pb-0 last:pb-0">
              {idx < MAIN_PATH.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[11px] top-6 bottom-0 w-0.5 sm:left-1/2 sm:right-[-50%] sm:top-[11px] sm:bottom-auto sm:h-0.5 sm:w-auto ${
                    done ? "bg-navy-800" : "bg-line"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold ${
                  done
                    ? "border-navy-800 bg-navy-800 text-white"
                    : isCurrent
                      ? "border-saffron bg-saffron-soft text-navy-900"
                      : "border-line-strong bg-surface text-ink-subtle"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : idx + 1}
              </span>
              <span
                className={`text-[13px] sm:text-[12px] sm:text-center leading-snug ${
                  isCurrent ? "font-semibold text-navy-900" : done ? "text-ink" : "text-ink-subtle"
                }`}
              >
                {meta.label}
                <span className="sr-only">{done ? " (completed)" : isCurrent ? " (current stage)" : " (upcoming)"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {branch && (
        <p className="mt-4 text-[13px] text-ink-muted">
          Current status: <span className="font-medium text-ink">{branch.label}</span>. {branch.description}
        </p>
      )}
      <p className="mt-3 text-[12px] text-ink-subtle">
        Stage is derived from the current status. Dated history needs the audit events endpoint.
      </p>
    </div>
  );
}
