import { Button, Card, Badge } from "@/lib/components/ui";
import { cn } from "@/lib/utils";
import type { Delegation } from "@/lib/types/rbac";

export interface DelegationCardProps {
  delegation: Delegation;
  fromName?: string;
  toName?: string;
  roleName?: string;
  onRevoke: (id: string) => void;
}

export function DelegationCard({ delegation: d, fromName, toName, roleName, onRevoke }: DelegationCardProps) {
  const start = new Date(d.startDate).getTime();
  const end = new Date(d.endDate).getTime();
  const now = Date.now();
  const pct = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  const remainingMs = end - now;
  const expiringSoon = d.status === "active" && remainingMs > 0 && remainingMs < 1000 * 60 * 60 * 48;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[14px]">
          <span className="font-medium text-[#0A0A0A]">{fromName ?? d.fromEmployeeId}</span>
          <span className="mx-2 text-[#6B6B6B]">→</span>
          <span className="font-medium text-[#0A0A0A]">{toName ?? d.toEmployeeId}</span>
        </div>
        <div className="flex items-center gap-2">
          {expiringSoon && <Badge variant="warning">Expiring soon</Badge>}
          {d.status === "active" && !expiringSoon && <Badge variant="success">Active</Badge>}
          {d.status === "expired" && <Badge variant="default">Expired</Badge>}
          {d.status === "revoked" && <Badge variant="danger">Revoked</Badge>}
        </div>
      </div>
      <div className="text-[13px] text-[#6B6B6B]">
        Delegated: {d.roleId ? <span className="text-[#0A0A0A] font-medium">{roleName ?? "Role"}</span> : <span>{d.permissions?.length ?? 0} specific permissions</span>}
        {d.reason && <span className="block text-[12px] mt-1 italic">"{d.reason}"</span>}
      </div>
      <div>
        <div className="flex items-center justify-between text-[12px] text-[#6B6B6B] mb-1">
          <span>{new Date(d.startDate).toLocaleDateString()}</span>
          <span>{new Date(d.endDate).toLocaleDateString()}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#E5E5E3] overflow-hidden">
          <div className={cn("h-full rounded-full")} style={{ width: `${pct}%`, background: expiringSoon ? "#F59E0B" : "var(--tenant-primary)" }} />
        </div>
      </div>
      {d.status === "active" && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onRevoke(d.id)}>Revoke</Button>
        </div>
      )}
    </Card>
  );
}