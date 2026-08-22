/** Vertical stepper over pipeline.events. */
import type { PipelineEvent } from "@/lib/types/candidate";
import { Card } from "@/lib/components/ui";

export interface PipelineTimelineProps {
  events: PipelineEvent[];
}

export function PipelineTimeline({ events }: PipelineTimelineProps) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Card>
      <h3 className="text-[13px] font-semibold text-[#0A0A0A] mb-4">Pipeline activity</h3>
      {sorted.length === 0 ? (
        <p className="text-[13px] text-[#6B6B6B]">No activity yet.</p>
      ) : (
        <ol className="space-y-0">
          {sorted.map((e, i) => (
            <li key={e.id} className="relative pl-6 pb-5 last:pb-0">
              {i !== sorted.length - 1 && (
                <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[#E5E5E3]" aria-hidden />
              )}
              <span
                className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white"
                style={{ background: i === 0 ? "var(--tenant-primary)" : "#D1D5DB" }}
                aria-hidden
              />
              <p className="text-[13px] font-medium text-[#0A0A0A]">{e.label}</p>
              <p className="text-[12px] text-[#9CA3AF]">
                {new Date(e.at).toLocaleString()}
                {e.actor ? ` · ${e.actor}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
