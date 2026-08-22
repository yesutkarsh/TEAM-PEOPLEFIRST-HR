import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock,
  Home,
  LifeBuoy,
  Megaphone,
  Settings,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { uiStore } from "@/lib/store/ui";
import { authStore } from "@/lib/store/auth";

export function GlobalSearchModal() {
  const navigate = useNavigate();
  const activeModalId = uiStore.useSelector((s) => s.activeModalId);
  const open = activeModalId === "search";
  const user = authStore.useSelector((s) => s.user);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        uiStore.toggleSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSelect = (to: string) => {
    uiStore.closeSearch();
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={(val) => !val && uiStore.closeSearch()}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleSelect("/dashboard")}>
            <Home className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/attendance")}>
            <Clock className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Attendance & Regularisation</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/leave")}>
            <CalendarDays className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Leave Management</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/payroll/payslips")}>
            <Wallet className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Payroll & Payslips</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/performance")}>
            <Target className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Performance & Goals</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/employees")}>
            <Users className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Employees Directory</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/org-chart")}>
            <Users className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Organization Chart</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/announcements")}>
            <Megaphone className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Announcements</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/helpdesk")}>
            <LifeBuoy className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Helpdesk & Support</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => handleSelect("/leave/apply")}>
            <CalendarDays className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Apply for Leave</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect("/attendance/regularization")}>
            <Clock className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Submit Regularisation Request</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              uiStore.closeSearch();
              uiStore.openAiPanel();
            }}
          >
            <Sparkles className="mr-2 h-4 w-4 text-[#6B6B6B]" />
            <span>Ask AI Assistant</span>
          </CommandItem>
          {(user?.role === "hr_admin" || user?.role === "super_admin") && (
            <CommandItem onSelect={() => handleSelect("/settings/company")}>
              <Settings className="mr-2 h-4 w-4 text-[#6B6B6B]" />
              <span>Company Settings</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
