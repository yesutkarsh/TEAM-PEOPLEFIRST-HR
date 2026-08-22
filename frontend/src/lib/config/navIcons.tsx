/** Maps NavIcon keys to lucide icons so nav config stays plain data. */
import {
  BarChart3, CalendarDays, Clock, Home, LifeBuoy, Megaphone, Receipt, Settings,
  Sparkles, Target, User, UserPlus, Users, Wallet,
} from "lucide-react";
import type { NavIcon } from "./navigation";

const MAP = {
  home: Home,
  users: Users,
  userPlus: UserPlus,
  clock: Clock,
  calendar: CalendarDays,
  wallet: Wallet,
  target: Target,
  megaphone: Megaphone,
  lifeBuoy: LifeBuoy,
  receipt: Receipt,
  user: User,
  barChart: BarChart3,
  sparkles: Sparkles,
  settings: Settings,
} as const;

export function NavIconGlyph({ name, className }: { name?: NavIcon; className?: string }) {
  if (!name) return null;
  const Icon = MAP[name];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
