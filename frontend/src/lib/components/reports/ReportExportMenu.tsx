import { useEffect, useRef, useState } from "react";
import { Button } from "@/lib/components/ui";
import { showToast } from "@/lib/components/ui/Toast";
import { ChevronDown, Download } from "lucide-react";
import { exportReport, EXPORT_LARGE_ROW_THRESHOLD, type ExportFormat } from "@/lib/api/reports";
import type { ReportRow } from "@/lib/types/reports";

export function ReportExportMenu({
  rows,
  columns,
  filenameBase = "report",
  disabled,
}: {
  rows: ReportRow[];
  columns: { key: string; label: string }[];
  filenameBase?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handle = (format: ExportFormat) => {
    setOpen(false);
    if (rows.length > EXPORT_LARGE_ROW_THRESHOLD) {
      showToast("Preparing your export — this may take a moment for large reports…", "info");
    }
    exportReport(rows, columns, format, filenameBase);
    if (rows.length <= EXPORT_LARGE_ROW_THRESHOLD) {
      showToast(`Export ready — ${rows.length} rows.`, "success");
    }
  };

  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="secondary" disabled={disabled} leadingIcon={<Download size={14} />} trailingIcon={<ChevronDown size={14} />} onClick={() => setOpen((o) => !o)}>
        Export
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-[#E5E5E3] bg-white shadow-md py-1">
          {(["csv", "excel", "pdf"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handle(f)}
              className="w-full text-left px-3 py-2 text-[13px] text-[#0A0A0A] hover:bg-[#FAFAF8]"
            >
              {f === "csv" ? "CSV" : f === "excel" ? "Excel (.xls)" : "PDF"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
