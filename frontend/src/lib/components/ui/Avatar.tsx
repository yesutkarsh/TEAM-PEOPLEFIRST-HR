import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/utils/format";

export interface AvatarProps {
  name?: string;
  initials?: string;
  src?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, initials, src, size = 36, className }: AvatarProps) {
  const label = initials ?? (name ? initialsFromName(name) : "?");
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--tenant-primary)] text-[var(--tenant-text-on-primary)] font-semibold overflow-hidden",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name ?? label}
    >
      {src ? <img src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : (label || "?")}
    </span>
  );
}