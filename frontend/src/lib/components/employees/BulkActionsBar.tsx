/** Bar shown when 1+ rows selected in directory. */
import { Button } from "@/lib/components/ui";

export interface BulkActionsBarProps {
  count: number;
  onExport: () => void;
  onArchive: () => void;
  onClear: () => void;
}

export function BulkActionsBar({ count, onExport, onArchive, onClear }: BulkActionsBarProps) {
  return (
    <div className="rounded-2xl bg-[#0A0A0A] border border-neutral-800 text-white p-4 shadow-xl flex items-center justify-between flex-wrap gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
        </span>
        <p className="text-[13px] font-bold tracking-tight">
          {count} employee{count === 1 ? "" : "s"} selected
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onExport} className="rounded-xl font-semibold">
          Export CSV
        </Button>
        <Button variant="danger" size="sm" onClick={onArchive} className="rounded-xl font-semibold">
          Archive
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-medium text-neutral-400 hover:text-white transition-colors px-2 py-1"
        >
          Deselect all
        </button>
      </div>
    </div>
  );
}