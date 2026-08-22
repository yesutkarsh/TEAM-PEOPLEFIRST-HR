import { Button } from "@/lib/components/ui";
import { Download } from "lucide-react";

export function ReportFilterBar({ onExportClick, children }: { onExportClick?: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#E5E5E3] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {onExportClick && (
        <Button size="sm" variant="secondary" leadingIcon={<Download size={14} />} onClick={onExportClick}>
          Export
        </Button>
      )}
    </div>
  );
}
