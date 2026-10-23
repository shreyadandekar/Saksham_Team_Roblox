import { CLOSED_STATUSES } from "../../lib/status";
import { daysUntil, formatDate, relativeDays } from "../../lib/format";

interface Props {
  maturityDate: string;
  status: string;
}

/** Maturity date with an urgency hint. Colour is reinforced by text, never used alone. */
export function MaturityIndicator({ maturityDate, status }: Props) {
  const closed = CLOSED_STATUSES.includes(status);
  const days = daysUntil(maturityDate);

  let hintClass = "text-ink-muted";
  if (!closed && days < 0) hintClass = "text-danger font-medium";
  else if (!closed && days <= 30) hintClass = "text-warning font-medium";

  return (
    <span className="flex flex-col leading-tight">
      <span className="text-sm text-ink tabular-nums whitespace-nowrap">{formatDate(maturityDate)}</span>
      {!closed && (
        <span className={`text-[12px] mt-0.5 whitespace-nowrap ${hintClass}`}>
          {days < 0 ? `Matured ${relativeDays(days).toLowerCase()}` : relativeDays(days)}
        </span>
      )}
    </span>
  );
}
