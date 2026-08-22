/**
 * Tenant sidebar — rendered from the role-based navigation config.
 * Desktop: sticky rail with icon-collapse. Mobile: slide-over drawer.
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/lib/hooks/usePermission";
import { authStore } from "@/lib/store/auth";
import { uiStore } from "@/lib/store/ui";
import { navForRole, type NavGroup, type NavNode } from "@/lib/config/navigation";
import { NavIconGlyph } from "@/lib/config/navIcons";

export interface SidebarProps {
  logoSrc?: string;
  companyName: string;
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function useAllowed(permission?: NavNode["permission"]) {
  const has = usePermission(permission ?? "dashboard.view");
  return permission ? has : true;
}

const activeStyle = {
  background: "color-mix(in srgb, var(--tenant-primary) 10%, transparent)",
  color: "var(--tenant-primary)",
};

function LeafLink({
  item,
  pathname,
  collapsed,
  depth = 0,
  onNavigate,
}: {
  item: NavNode;
  pathname: string;
  collapsed: boolean;
  depth?: number;
  onNavigate?: () => void;
}) {
  const allowed = useAllowed(item.permission);
  if (!allowed || !item.to) return null;
  const active = pathname === item.to || pathname.startsWith(item.to + "/");
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-3 transition-colors duration-150",
        "hover:bg-black/[0.045] active:scale-[0.99] motion-reduce:active:scale-100",
        depth === 0 ? "py-2 text-[14px]" : "py-1.5 text-[13px]",
        active && "font-semibold",
        collapsed && "justify-center px-0",
      )}
      style={active ? activeStyle : undefined}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
          style={{ background: "var(--tenant-primary)" }}
        />
      )}
      {depth === 0 && <NavIconGlyph name={item.icon} className="h-[17px] w-[17px] shrink-0 opacity-80" />}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function ExpandableItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavNode;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const allowed = useAllowed(item.permission);
  const childActive = item.children?.some((c) => c.to && pathname.startsWith(c.to)) ?? false;
  const [open, setOpen] = useState(childActive);
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);
  if (!allowed) return null;

  if (collapsed) {
    const first = item.children?.[0];
    return first ? (
      <LeafLink item={{ ...item, to: first.to }} pathname={pathname} collapsed onNavigate={onNavigate} />
    ) : null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] transition-colors duration-150",
          "hover:bg-black/[0.045]",
          childActive && "font-semibold",
        )}
        style={childActive ? { color: "var(--tenant-primary)" } : undefined}
      >
        <NavIconGlyph name={item.icon} className="h-[17px] w-[17px] shrink-0 opacity-80" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          aria-hidden
          className={cn("h-3.5 w-3.5 opacity-50 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ul className="overflow-hidden pl-[26px] ml-3 border-l border-black/10 space-y-0.5">
          {item.children!.map((c) => (
            <li key={c.label}>
              <LeafLink item={c} pathname={pathname} collapsed={false} depth={1} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function GroupBlock({
  group,
  pathname,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-5">
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B6B]/70">
          {group.label}
        </p>
      )}
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <li key={item.label}>
            {item.children ? (
              <ExpandableItem item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
            ) : (
              <LeafLink item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SidebarBody({
  logoSrc,
  companyName,
  collapsed,
  onToggle,
  onNavigate,
  onMobileClose,
}: SidebarProps & { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = authStore.useSelector((s) => s.user?.role);
  const groups = navForRole(role);

  return (
    <div className="h-full flex flex-col bg-[var(--tenant-secondary)] text-[var(--tenant-text-on-secondary)]">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-black/5">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
        ) : (
          <span
            className="h-8 w-8 rounded-md flex items-center justify-center text-[14px] font-bold shrink-0"
            style={{ background: "var(--tenant-primary)", color: "var(--tenant-text-on-primary)" }}
          >
            {companyName[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        {!collapsed && <span className="font-semibold text-[14px] truncate">{companyName}</span>}
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="md:hidden ml-auto p-2 -mr-2 rounded-md hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => uiStore.openSearch()}
            className="w-full flex items-center justify-between gap-2 text-left text-[12px] text-[#6B6B6B] bg-white/60 border border-black/5 rounded-md px-3 py-2 hover:bg-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span>Search…</span>
            </div>
            <kbd className="text-[10px] font-mono opacity-60 bg-black/5 px-1 py-0.5 rounded">⌘K</kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 p-3 overflow-y-auto">
        {groups.map((g) => (
          <GroupBlock key={g.label} group={g} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {onToggle && (
        <div className="p-3 border-t border-black/5 hidden md:block">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 rounded-md py-2 text-[13px] text-[#6B6B6B] hover:bg-black/5 hover:text-[#0A0A0A] transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ logoSrc, companyName, collapsed = false, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden md:flex h-screen sticky top-0 shrink-0 border-r border-[#E5E5E3] flex-col",
          "transition-[width] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <SidebarBody logoSrc={logoSrc} companyName={companyName} collapsed={collapsed} onToggle={onToggle} />
      </aside>

      {/* Mobile drawer */}
      <div className={cn("md:hidden fixed inset-0 z-50", mobileOpen ? "" : "pointer-events-none")}>
        <div
          onClick={onMobileClose}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[80%] max-w-[280px] shadow-xl",
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody
            logoSrc={logoSrc}
            companyName={companyName}
            collapsed={false}
            onNavigate={onMobileClose}
            onMobileClose={onMobileClose}
          />
        </div>
      </div>
    </>
  );
}

function uiPushComingSoon() {
  void import("@/lib/store/ui").then(({ uiStore }) =>
    uiStore.pushToast({ message: "Command palette coming soon", variant: "info" }),
  );
}
