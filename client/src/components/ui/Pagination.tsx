import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 sm:px-5 border-t border-line"
    >
      <p className="text-[13px] text-ink-muted" aria-live="polite">
        Showing <span className="font-medium text-ink tabular-nums">{start}</span>
        {"–"}
        <span className="font-medium text-ink tabular-nums">{end}</span> of{" "}
        <span className="font-medium text-ink tabular-nums">{total}</span> records
      </p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          variant="secondary"
          size="sm"
          className="h-11 sm:h-9"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <span className="text-[13px] text-ink-muted tabular-nums px-1">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="h-11 sm:h-9"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
