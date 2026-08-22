/** Sortable data table with loading skeleton and empty state slot. */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  sortKey?: string;
  sortDir?: SortDirection;
  onSort?: (key: string, dir: SortDirection) => void;
  getRowKey?: (row: T) => string;
  /** Row selection — requires getRowKey. */
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  /** Rows that cannot be selected (e.g. terminal states). */
  isRowSelectable?: (row: T) => boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyState,
  sortKey,
  sortDir,
  onSort,
  getRowKey,
  selectable,
  selectedKeys = [],
  onSelectionChange,
  isRowSelectable,
  className,
}: DataTableProps<T>) {
  const keyOf = (row: T, i: number) => (getRowKey ? getRowKey(row) : String(i));
  const selectableRows = selectable ? data.filter((r) => (isRowSelectable ? isRowSelectable(r) : true)) : [];
  const selectableKeys = selectableRows.map((r, i) => keyOf(r, i));
  const allSelected = selectableKeys.length > 0 && selectableKeys.every((k) => selectedKeys.includes(k));
  const toggleAll = () => onSelectionChange?.(allSelected ? [] : selectableKeys);
  const toggleOne = (k: string) =>
    onSelectionChange?.(selectedKeys.includes(k) ? selectedKeys.filter((x) => x !== k) : [...selectedKeys, k]);
  const colCount = columns.length + (selectable ? 1 : 0);
  const handleSort = (key: string) => {
    if (!onSort) return;
    const nextDir: SortDirection =
      sortKey !== key ? "asc" : sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc";
    onSort(key, nextDir);
  };

  return (
    <div className={cn("rounded-2xl border border-[#E5E5E3] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]", className)}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-[14px] min-w-[640px] border-collapse">
          <thead className="bg-[#FAFAF9] border-b border-[#E5E5E3]">
            <tr>
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 accent-[#0A0A0A] rounded cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sortKey === col.key;
                const chev = active ? (sortDir === "asc" ? "↑" : sortDir === "desc" ? "↓" : "") : "";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#8E8E8E]",
                      col.align === "right" && "text-right",
                      col.className,
                    )}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), handleSort(col.key))}
                        className="inline-flex items-center gap-1 hover:text-[#0A0A0A] transition-colors focus:outline-none focus-visible:text-[#0A0A0A]"
                      >
                        {col.label}
                        {chev && <span aria-hidden>{chev}</span>}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F2F0]">
            {loading ? (
              Array.from({ length: 6 }).map((_, ri) => (
                <tr key={ri} className="border-b border-[#F2F2F0] last:border-0">
                  {selectable && <td className="px-4 py-4" />}
                  {columns.map((c, ci) => (
                    <td key={ci} className={cn("px-4 py-4", c.className)}>
                      <span className="block h-3.5 rounded-lg bg-[#F2F2F0] animate-pulse" style={{ width: `${40 + ((ri + ci) % 4) * 12}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12">{emptyState ?? <p className="text-center text-[#6B6B6B] text-[14px]">No data.</p>}</td>
              </tr>
            ) : (
              data.map((row, ri) => {
                const rowKey = keyOf(row, ri);
                const canSelect = isRowSelectable ? isRowSelectable(row) : true;
                return (
                  <tr
                    key={rowKey}
                    className="border-b border-[#F2F2F0] last:border-0 hover:bg-[#FAFAF9]/80 transition-colors"
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          disabled={!canSelect}
                          checked={selectedKeys.includes(rowKey)}
                          onChange={() => toggleOne(rowKey)}
                          className="h-4 w-4 accent-[#0A0A0A] rounded disabled:opacity-40 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-4 text-[#0A0A0A] font-medium", col.align === "right" && "text-right", col.className)}>
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

