import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "react-router-dom";
import type { InstrumentSummary } from "../../types/auth";
import { STATUS_META, STATUS_ORDER } from "../../lib/status";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { EmptyState, Skeleton } from "../ui/States";

interface Props {
  instruments: InstrumentSummary[];
  loading: boolean;
}

export function StatusDistributionChart({ instruments, loading }: Props) {
  const data = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_META[status].label,
    count: instruments.filter((i) => i.status === status).length,
    color: STATUS_META[status].chartColor,
  })).filter((d) => d.count > 0);

  return (
    <Card>
      <CardHeader
        id="status-chart-heading"
        title="Records by status"
        description="Where each FDR currently sits in the lifecycle."
      />
      <CardBody>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <EmptyState title="No records yet" description="Status counts appear once FDRs are on file." />
        ) : (
          <>
            <div className="h-64" role="img" aria-labelledby="status-chart-heading" aria-describedby="status-chart-data">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#e6eaef" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#637083" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 12, fill: "#182536" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "#f0f3f6" }}
                    contentStyle={{ borderRadius: 8, borderColor: "#dce2e8", fontSize: 13 }}
                    formatter={(value) => [`${value} records`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {data.map((d) => (
                      <Cell key={d.status} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul id="status-chart-data" className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {data.map((d) => (
                <li key={d.status}>
                  <Link
                    to={`/instruments?status=${d.status}`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-navy-900 hover:underline"
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden="true" />
                    {d.label}: <span className="font-medium text-ink tabular-nums">{d.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
