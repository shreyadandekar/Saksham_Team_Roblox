import { Search, X } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "../../lib/status";
import { Field, Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";

export const SORT_OPTIONS = [
  { value: "maturity-asc", label: "Maturity date, soonest first" },
  { value: "maturity-desc", label: "Maturity date, latest first" },
  { value: "amount-desc", label: "Amount, highest first" },
  { value: "amount-asc", label: "Amount, lowest first" },
  { value: "issue-desc", label: "Issue date, newest first" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface FilterValues {
  q: string;
  status: string;
  bank: string;
  inst: string;
  sort: SortValue;
}

interface Props {
  values: FilterValues;
  banks: string[];
  institutions: { id: string; name: string }[];
  showInstitution: boolean;
  onChange: (patch: Partial<FilterValues>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function InstrumentFilters({ values, banks, institutions, showInstitution, onChange, onReset, hasActiveFilters }: Props) {
  return (
    <form
      role="search"
      aria-label="Filter FDR records"
      onSubmit={(e) => e.preventDefault()}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-end"
    >
      <Field id="filter-q" label="Search">
        <Input
          id="filter-q"
          type="search"
          placeholder="FDR number, bank, branch or favouring"
          value={values.q}
          onChange={(e) => onChange({ q: e.target.value })}
          leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
        />
      </Field>
      <Field id="filter-status" label="Status">
        <Select id="filter-status" value={values.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
      </Field>
      <Field id="filter-bank" label="Bank">
        <Select id="filter-bank" value={values.bank} onChange={(e) => onChange({ bank: e.target.value })}>
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </Select>
      </Field>
      {showInstitution ? (
        <Field id="filter-inst" label="Institution">
          <Select id="filter-inst" value={values.inst} onChange={(e) => onChange({ inst: e.target.value })}>
            <option value="">All institutions</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="hidden xl:block" aria-hidden="true" />
      )}
      <Field id="filter-sort" label="Sort by">
        <Select id="filter-sort" value={values.sort} onChange={(e) => onChange({ sort: e.target.value as SortValue })}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>
      {hasActiveFilters && (
        <div className="sm:col-span-2 xl:col-span-5">
          <Button variant="ghost" size="sm" onClick={onReset} className="-ml-2">
            <X className="h-4 w-4" aria-hidden="true" />
            Clear filters
          </Button>
        </div>
      )}
    </form>
  );
}
