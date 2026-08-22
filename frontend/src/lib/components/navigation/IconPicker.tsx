/** Curated grid of Lucide icons for custom navigation items. */
import {
  Award, Bell, BookOpen, Briefcase, Calendar, ClipboardList, Coffee, FileText,
  Flag, Gift, GraduationCap, Heart, Laptop, Lightbulb, Mail, MapPin, Package,
  Phone, Settings, Shield, Target, Truck, Users, Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ICONS: Record<string, LucideIcon> = {
  Briefcase, ClipboardList, FileText, Users, Calendar, Settings,
  Heart, Shield, Award, Coffee, Laptop, Phone, Mail, MapPin,
  Package, Truck, Wrench, BookOpen, GraduationCap, Gift, Flag,
  Bell, Lightbulb, Target,
};

export function NavIcon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && NAV_ICONS[name]) || ClipboardList;
  return <Cmp className={cn("h-4 w-4 shrink-0", className)} aria-hidden />;
}

export interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label = "Icon" }: IconPickerProps) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-[#0A0A0A]">{label}</p>
      <div className="grid grid-cols-8 gap-1.5 rounded-md border border-[#E5E5E3] bg-white p-2">
        {Object.entries(NAV_ICONS).map(([name, Cmp]) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={active}
              onClick={() => onChange(name)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-sm transition-colors hover:bg-black/5",
                active && "text-white",
              )}
              style={active ? { background: "var(--tenant-primary)" } : undefined}
            >
              <Cmp className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}