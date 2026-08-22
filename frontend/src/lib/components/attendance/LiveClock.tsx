/** Ticking wall clock + elapsed-time readout. Client-only values guarded for SSR. */
import { useEffect, useState } from "react";
import { formatMinutes } from "@/lib/utils/attendanceChecks";

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={className}>
      <p className="text-[40px] leading-none font-bold tracking-[-0.02em] tabular-nums">
        {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) : "--:--:--"}
      </p>
      <p className="mt-1.5 text-[13px] text-[#6B6B6B]">
        {now ? now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "—"}
      </p>
    </div>
  );
}

export function ElapsedTimer({ since, paused, label }: { since?: string; paused?: boolean; label: string }) {
  const [minutes, setMinutes] = useState(0);
  useEffect(() => {
    if (!since) {
      setMinutes(0);
      return;
    }
    const tick = () => setMinutes(Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60000)));
    tick();
    const t = setInterval(tick, 15_000);
    return () => clearInterval(t);
  }, [since]);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6B6B6B]">{label}</p>
      <p className="text-[18px] font-semibold tabular-nums">
        {since ? formatMinutes(minutes) : "—"}
        {paused && <span className="ml-2 text-[12px] font-normal text-[#B45309]">paused</span>}
      </p>
    </div>
  );
}