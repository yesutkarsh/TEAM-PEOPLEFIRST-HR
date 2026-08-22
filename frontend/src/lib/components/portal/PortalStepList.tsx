/** Vertical step list derived from STEP_DEFINITIONS + pipeline status. */
import { STEP_DEFINITIONS } from "@/lib/types/candidate";
import type { CandidatePipelineStatus } from "@/lib/types/candidate";
import { PortalStepItem, type PortalStepState } from "./PortalStepItem";

export interface PortalStepListProps {
  pipelineId: string;
  status: CandidatePipelineStatus;
}

export function PortalStepList({ pipelineId, status }: PortalStepListProps) {
  return (
    <div className="flex flex-col divide-y divide-[#F2F2F0]">
      {STEP_DEFINITIONS.map((step) => {
        const state: PortalStepState = step.completedStatuses.includes(status)
          ? "completed"
          : step.activeStatuses.includes(status)
            ? "active"
            : "locked";
        return (
          <PortalStepItem
            key={step.id}
            label={step.label}
            description={step.description}
            state={state}
            href={state === "active" ? step.route?.(pipelineId) ?? null : null}
          />
        );
      })}
    </div>
  );
}
