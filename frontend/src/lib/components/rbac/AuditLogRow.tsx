import { cn } from "@/lib/utils";
import type { PermissionAuditEntry } from "@/lib/types/rbac";

const COLOR: Record<PermissionAuditEntry["action"], string> = {
  role_created: "bg-blue-100 text-blue-800",
  role_updated: "bg-amber-100 text-amber-800",
  role_deleted: "bg-red-100 text-red-800",
  role_assigned: "bg-green-100 text-green-800",
  role_unassigned: "bg-red-100 text-red-800",
  delegation_created: "bg-teal-100 text-teal-800",
  delegation_revoked: "bg-orange-100 text-orange-800",
};

export function AuditLogRow({ entry }: { entry: PermissionAuditEntry }) {
  return (
    <tr className="border-b border-[#E5E5E3] last:border-0">
      <td className="py-2.5 pr-4 text-[12px] text-[#6B6B6B] whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
      <td className="py-2.5 pr-4 text-[13px] text-[#0A0A0A]">{entry.actorName}</td>
      <td className="py-2.5 pr-4">
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", COLOR[entry.action])}>
          {entry.action.replace(/_/g, " ")}
        </span>
      </td>
      <td className="py-2.5 text-[13px] text-[#0A0A0A]">{entry.details}</td>
    </tr>
  );
}