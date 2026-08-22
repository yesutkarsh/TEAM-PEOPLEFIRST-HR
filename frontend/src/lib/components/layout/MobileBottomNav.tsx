/** Fixed bottom navigation for small screens — destinations come from the role nav config. */
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { authStore } from "@/lib/store/auth";
import { MOBILE_NAV } from "@/lib/config/navigation";
import { NavIconGlyph } from "@/lib/config/navIcons";

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = authStore.useSelector((s) => s.user?.role) ?? "employee";
  const items = MOBILE_NAV[role] ?? MOBILE_NAV.employee;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#E5E5E3] bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <li key={item.to} className="flex-1 min-w-0">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  "active:scale-95 motion-reduce:active:scale-100",
                  active ? "" : "text-[#6B6B6B]",
                )}
                style={active ? { color: "var(--tenant-primary)" } : undefined}
              >
                <NavIconGlyph name={item.icon} className="h-[18px] w-[18px]" />
                <span className="truncate max-w-full px-1">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
