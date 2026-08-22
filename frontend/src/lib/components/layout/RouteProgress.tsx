/**
 * Slim top progress bar shown while the router resolves a navigation.
 * Deliberately minimal: 2px, tenant-primary, no spinner overlay — the goal is
 * instant feedback on click, not a blocking loading screen.
 */
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteProgress() {
  const isPending = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPending) {
      setVisible(true);
      return;
    }
    // keep the bar on screen just long enough to complete its sweep
    const t = setTimeout(() => setVisible(false), 220);
    return () => clearTimeout(t);
  }, [isPending]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 inset-x-0 z-[60] h-[2px] overflow-hidden"
    >
      <div
        className="h-full w-full origin-left animate-[route-progress_600ms_ease-out_forwards] motion-reduce:animate-none"
        style={{ background: "var(--tenant-primary)" }}
      />
    </div>
  );
}
