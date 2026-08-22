/** Grid/summary card for a candidate + active pipeline. */
import { Link } from "@tanstack/react-router";
import type { Candidate, HiringPipeline } from "@/lib/types/candidate";
import { CandidateStatusBadge } from "./CandidateStatusBadge";

export interface CandidateCardProps {
  candidate: Candidate;
  pipeline: HiringPipeline;
}

function initials(first: string, last: string) {
  return (first[0] ?? "?") + (last[0] ?? "");
}

export function CandidateCard({ candidate, pipeline }: CandidateCardProps) {
  return (
    <Link
      to="/candidates/$candidateId"
      search={{ tab: "overview" as const }}
      params={{ candidateId: candidate.id }}
      className="group block rounded-md border border-[#E5E5E3] bg-white p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex flex-col items-center text-center">
        <span
          className="h-16 w-16 rounded-full inline-flex items-center justify-center font-semibold uppercase text-[20px]"
          style={{ background: "var(--tenant-secondary)", color: "var(--tenant-text-on-secondary)" }}
        >
          {initials(candidate.firstName, candidate.lastName)}
        </span>
        <p className="mt-3 font-semibold text-[14px] text-[#0A0A0A] truncate w-full">
          {candidate.firstName} {candidate.lastName}
        </p>
        <p className="text-[13px] text-[#6B6B6B] truncate w-full">{pipeline.roleName ?? "—"}</p>
        <p className="text-[12px] text-[#9CA3AF] truncate w-full">{candidate.email}</p>
        <div className="mt-3">
          <CandidateStatusBadge status={pipeline.status} size="sm" />
        </div>
        <span className="mt-3 text-[12px] text-[var(--tenant-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          View candidate →
        </span>
      </div>
    </Link>
  );
}
