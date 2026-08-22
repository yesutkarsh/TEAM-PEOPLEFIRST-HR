/**
 * Wraps page content and replays a very short enter animation on each route
 * change. 140ms fade + 4px rise — enough to signal "something happened",
 * short enough that the app still feels instant. Respects reduced motion.
 */
import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="animate-[route-enter_140ms_ease-out] motion-reduce:animate-none">
      {children}
    </div>
  );
}
