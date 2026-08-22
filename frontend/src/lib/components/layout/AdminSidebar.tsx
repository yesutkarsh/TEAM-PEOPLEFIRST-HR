/** Super admin sidebar — always Default Theme (no tenant vars). */
import { Link, useRouterState } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Item { label: string; to?: string; lockedNote?: string }
interface Group { label: string; items: Item[] }

const NAV: Group[] = [
  {
    label: "Platform",
    items: [
      { label: "Dashboard", to: "/admin/dashboard" },
      { label: "Tenants", to: "/admin/tenants" },
      { label: "Settings", to: "/admin/settings" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Audit log", lockedNote: "Available in a later phase" },
      { label: "Impersonation log", lockedNote: "Available in a later phase" },
    ],
  },
];

export function AdminSidebar({ adminName, onLogout }: { adminName: string; onLogout: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="h-screen sticky top-0 w-60 shrink-0 border-r border-[#E5E5E3] flex flex-col bg-[#0A0A0A] text-white">
      <div className="h-16 px-5 flex items-center border-b border-white/10">
        <div>
          <p className="text-[15px] font-bold tracking-[-0.01em]">HRMS Platform</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/50">Admin</p>
        </div>
      </div>
      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                if (it.lockedNote) {
                  return (
                    <li key={it.label}>
                      <div
                        title={it.lockedNote}
                        className="flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] text-white/40 cursor-not-allowed"
                      >
                        <span className="flex-1">{it.label}</span>
                        <Lock className="h-3.5 w-3.5 text-white/40" aria-hidden />
                      </div>
                    </li>
                  );
                }
                const active = it.to ? pathname === it.to || pathname.startsWith(it.to + "/") : false;
                return (
                  <li key={it.label}>
                    <Link
                      to={it.to!}
                      className={cn(
                        "block rounded-sm px-3 py-2 text-[14px] transition-colors",
                        active ? "bg-white/10 text-white font-semibold" : "text-white/80 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <p className="text-[13px] font-medium px-3">{adminName}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 w-full text-left rounded-sm px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
