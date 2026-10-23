import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { InstrumentSummary } from "../../types/auth";
import { formatDate, formatINR } from "../../lib/format";
import { StatusBadge } from "../ui/Badge";
import { MaturityIndicator } from "./MaturityIndicator";

interface Props {
  rows: InstrumentSummary[];
  showInstitution: boolean;
}

export function InstrumentTable({ rows, showInstitution }: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">FDR records</caption>
        <thead className="bg-muted/70 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
          <tr>
            <th scope="col" className="px-5 py-3">FDR number</th>
            {showInstitution && <th scope="col" className="px-3 py-3">Institution</th>}
            <th scope="col" className="px-3 py-3">Bank and branch</th>
            <th scope="col" className="px-3 py-3 text-right">Amount</th>
            <th scope="col" className="px-3 py-3">Issued</th>
            <th scope="col" className="px-3 py-3">Maturity</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((i) => (
            <tr key={i.id} className="relative hover:bg-navy-50/50 transition-colors duration-150 focus-within:bg-navy-50/50">
              <td className="px-5 py-3 align-top">
                <Link
                  to={`/instruments/${i.id}`}
                  className="font-medium text-navy-900 hover:underline after:absolute after:inset-0 focus-visible:outline-none"
                >
                  {i.instrumentNumber}
                </Link>
              </td>
              {showInstitution && (
                <td className="px-3 py-3 align-top max-w-[220px]">
                  <span className="block truncate text-ink">{i.institution?.name ?? "—"}</span>
                  {i.institution?.code && <span className="block text-[12px] text-ink-muted">{i.institution.code}</span>}
                </td>
              )}
              <td className="px-3 py-3 align-top max-w-[220px]">
                <span className="block truncate text-ink">{i.bankName}</span>
                <span className="block truncate text-[12px] text-ink-muted">{i.branchName}</span>
              </td>
              <td className="px-3 py-3 align-top text-right font-medium text-ink tabular-nums whitespace-nowrap">{formatINR(i.amount)}</td>
              <td className="px-3 py-3 align-top text-ink-muted tabular-nums whitespace-nowrap">{formatDate(i.issueDate)}</td>
              <td className="px-3 py-3 align-top"><MaturityIndicator maturityDate={i.maturityDate} status={i.status} /></td>
              <td className="px-3 py-3 align-top"><StatusBadge status={i.status} /></td>
              <td className="px-3 py-3 align-top text-ink-subtle"><ChevronRight className="h-4 w-4" aria-hidden="true" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InstrumentCardList({ rows, showInstitution }: Props) {
  return (
    <ul className="md:hidden divide-y divide-line">
      {rows.map((i) => (
        <li key={i.id}>
          <Link to={`/instruments/${i.id}`} className="block px-4 py-4 hover:bg-muted/60 transition-colors duration-150">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-navy-900 break-all">{i.instrumentNumber}</span>
                {showInstitution && i.institution && (
                  <span className="block text-[13px] text-ink-muted truncate">{i.institution.name}</span>
                )}
              </span>
              <StatusBadge status={i.status} />
            </span>
            <span className="mt-2 block text-[13px] text-ink truncate">
              {i.bankName} · {i.branchName}
            </span>
            <span className="mt-3 flex items-end justify-between gap-3">
              <span>
                <span className="block text-[11px] uppercase tracking-wide text-ink-subtle">Amount</span>
                <span className="block text-[15px] font-semibold text-ink tabular-nums">{formatINR(i.amount)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[11px] uppercase tracking-wide text-ink-subtle">Maturity</span>
                <MaturityIndicator maturityDate={i.maturityDate} status={i.status} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
