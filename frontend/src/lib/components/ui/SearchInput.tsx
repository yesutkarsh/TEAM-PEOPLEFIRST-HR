/** Debounced search input with leading icon and clear button. */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({ placeholder = "Search…", value, onChange, onClear, debounceMs = 300, className }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setLocal(value), [value]);
  const handle = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), debounceMs);
  };
  const clear = () => {
    setLocal("");
    if (timer.current) clearTimeout(timer.current);
    onChange("");
    onClear?.();
  };
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">⌕</span>
      <input
        type="search"
        value={local}
        onChange={(e) => handle(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-9 rounded-md border border-[#E5E5E3] bg-white text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-full text-[#6B6B6B] hover:bg-[#F2F2F0]"
        >
          ×
        </button>
      )}
    </div>
  );
}