import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InstrumentSummary } from "../../types/auth";
import { CLOSED_STATUSES } from "../../lib/status";
import { formatINRCompact, toAmount } from "../../lib/format";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { EmptyState, Skeleton } from "../ui/States";

interface Props {
  instruments: InstrumentSummary[];
  loading: boolean;
}

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });

function buildMonths(instruments: InstrumentSummary[]) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: monthFmt.format(d), value: 0, count: 0 };
  });
  const index = new Map(months.map((m, i) => [m.key, i]));
  for (const inst of instruments) {
    if (CLOSED_STATUSES.includes(inst.status)) continue;
    const d = new Date(inst.maturityDate);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i === undefined) continue;
    months[i].value += toAmount(inst.amount);
    months[i].count += 1;
  }
  return months;
}

export function MaturityTimelineChart({ instruments, loading }: Props) {
  const months = buildMonths(instruments);
  const hasData = months.some((m) => m.count > 0);
  const total = months.reduce((a, m) => a + m.value, 0);

  return (
    <Card>
      <CardHeader
        id="maturity-chart-heading"
        title="Value maturing, next 12 months"
        description={hasData ? `${formatINRCompact(total)} in open deposits reaches maturity this year.` : "Open deposits only."}
      />
      <CardBody>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !hasData ? (
          <EmptyState title="Nothing maturing this year" description="No open deposits reach maturity in the next 12 months." />
        ) : (
          <>
            <div className="h-64" role="img" aria-labelledby="maturity-chart-heading" aria-describedby="maturity-chart-data">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e6eaef" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#637083" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis width={56} tickFormatter={(v) => formatINRCompact(Number(v))} tick={{ fontSize: 11, fill: "#637083" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f0f3f6" }}
                    contentStyle={{ borderRadius: 8, borderColor: "#dce2e8", fontSize: 13 }}
                    formatter={(value) => [formatINRCompact(Number(value)), "Value maturing"]}
                  />
                  <Bar dataKey="value" fill="#17365d" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul id="maturity-chart-data" className="sr-only">
              {months.filter((m) => m.count > 0).map((m) => (
                <li key={m.key}>
                  {m.label}: {m.count} records, {formatINRCompact(m.value)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
