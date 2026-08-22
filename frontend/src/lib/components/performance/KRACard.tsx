import { Card, Badge } from "@/lib/components/ui";
import { KPIRow } from "./KPIRow";
import type { KRA } from "@/lib/types/performance";

export function KRACard({ kra }: { kra: KRA }) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{kra.name}</h3>
          {kra.description && <p className="text-[12px] text-[#6B6B6B] mt-0.5">{kra.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="default">{kra.weightage}% weight</Badge>
          {kra.rating !== undefined ? (
            <Badge variant="success">Rated {kra.rating}</Badge>
          ) : (
            <Badge variant="warning">Unrated</Badge>
          )}
        </div>
      </div>
      <div className="pt-1">
        {kra.kpis.map((k) => <KPIRow key={k.id} kpi={k} />)}
      </div>
    </Card>
  );
}
