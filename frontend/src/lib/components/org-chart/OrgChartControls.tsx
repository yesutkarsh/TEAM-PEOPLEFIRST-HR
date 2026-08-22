/** Zoom / fit / search controls for the org chart. */
import { SearchInput } from "@/lib/components/ui/SearchInput";
import { Button } from "@/lib/components/ui";

export interface OrgChartControlsProps {
  query: string;
  onQuery: (q: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function OrgChartControls({ query, onQuery, onZoomIn, onZoomOut, onFit }: OrgChartControlsProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-2">Search</p>
        <SearchInput placeholder="Search by name…" value={query} onChange={onQuery} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B6B] mb-2">View</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onZoomOut}>−</Button>
          <Button variant="secondary" size="sm" onClick={onZoomIn}>+</Button>
          <Button variant="secondary" size="sm" onClick={onFit}>Fit</Button>
        </div>
      </div>
      <p className="text-[12px] text-[#6B6B6B]">Click a node to expand or collapse its reports.</p>
    </div>
  );
}