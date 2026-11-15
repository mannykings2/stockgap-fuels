import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cx, Spinner, EmptyState } from "./primitives";
import { Input } from "./form";
import type { PageMeta } from "@/types";

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  keyFor,
  loading,
  emptyTitle = "Nothing to show yet",
  emptyDescription,
  emptyAction,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  if (loading) return <Spinner label="Loading records" />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2/60">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "px-4 py-2.5 text-[11px] font-semibold tracking-wide text-muted uppercase",
                  column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFor(row)} className="border-b border-line/60 last:border-0 hover:bg-surface-2/50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    "px-4 py-3 align-middle text-ink-soft",
                    column.align === "right" ? "text-right tabular-nums" : column.align === "center" ? "text-center" : "text-left",
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableToolbar({
  search,
  onSearch,
  placeholder = "Search",
  children,
}: {
  search?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      {onSearch ? (
        <div className="relative min-w-[200px] flex-1 md:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={search ?? ""}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-9 pl-8 text-[13px]"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (page: number) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
      <p>
        Page {meta.page} of {meta.totalPages} · {meta.total} record{meta.total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(meta.page - 1)}
          disabled={meta.page <= 1}
          className="inline-flex size-8 items-center justify-center rounded-[8px] border border-line text-ink-soft disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          className="inline-flex size-8 items-center justify-center rounded-[8px] border border-line text-ink-soft disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
