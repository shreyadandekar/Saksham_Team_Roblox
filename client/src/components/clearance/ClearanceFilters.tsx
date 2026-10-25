/**
 * src/components/clearance/ClearanceFilters.tsx
 *
 * Filter toolbar for the Clearance Command Center.
 */

import { Search, Filter, RotateCcw } from "lucide-react";

interface ClearanceFiltersProps {
  search: string;
  stage: string;
  department: string;
  onSearchChange: (search: string) => void;
  onStageChange: (stage: string) => void;
  onDepartmentChange: (dept: string) => void;
  onReset: () => void;
}

export default function ClearanceFilters({
  search,
  stage,
  department,
  onSearchChange,
  onStageChange,
  onDepartmentChange,
  onReset,
}: ClearanceFiltersProps) {
  const hasActiveFilters =
    search.trim() !== "" || stage !== "ALL" || department !== "ALL";

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by FDR number, bank name, institution name or code..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </div>

          {/* Stage Dropdown */}
          <select
            value={stage}
            onChange={(e) => onStageChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Stages</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="DOCUMENT_REVIEW">Document Scrutiny</option>
            <option value="CORRECTION_REQUIRED">Correction Required</option>
            <option value="CLEARANCES_PENDING">Clearances Pending</option>
            <option value="READY_FOR_FINAL_DECISION">Ready for Final NOC</option>
            <option value="ON_HOLD">On Regulatory Hold</option>
            <option value="NOC_ISSUED">NOC Issued / Approved</option>
          </select>

          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="PGRC">PGRC Cell</option>
            <option value="VIGILANCE">Vigilance Cell</option>
            <option value="OTHER_APPLICABLE_BUREAU">Regional / Other Bureau</option>
          </select>

          {/* Reset button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
