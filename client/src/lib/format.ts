const inrFull = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function toAmount(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatINR(value: string | number): string {
  return inrFull.format(toAmount(value));
}

/** Compact Indian notation: ₹5.0 L, ₹1.25 Cr. */
export function formatINRCompact(value: string | number): string {
  const n = toAmount(value);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.00$/, "")} L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1).replace(/\.0$/, "")} K`;
  return inrFull.format(n);
}

export function formatDate(value: string | undefined | null): string {
  if (!value) return "Not recorded";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not recorded" : dateFmt.format(d);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole days from today until the given date. Negative when in the past. */
export function daysUntil(value: string): number {
  return Math.round((startOfDay(new Date(value)) - startOfDay(new Date())) / DAY_MS);
}

export function tenureLabel(issue: string, maturity: string): string {
  const days = Math.round(
    (startOfDay(new Date(maturity)) - startOfDay(new Date(issue))) / DAY_MS,
  );
  if (!Number.isFinite(days) || days < 0) return "Not available";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const parts: string[] = [];
  if (years) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} mo`);
  return parts.length ? parts.join(" ") : `${days} days`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
}
