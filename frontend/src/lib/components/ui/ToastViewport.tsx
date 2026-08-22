/** Renders the global toast queue. Place once near the app root. */
import { uiStore } from "@/lib/store/ui";
import { cn } from "@/lib/utils";

export function ToastViewport() {
  const toasts = uiStore.useSelector((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const assertive = t.variant === "error" || t.variant === "warning";
        return (
          <div
            key={t.id}
            role="alert"
            aria-live={assertive ? "assertive" : "polite"}
            className={cn(
              "min-w-[260px] max-w-sm rounded-md px-4 py-3 text-[14px] shadow-lg border flex items-start gap-3 bg-white",
              t.variant === "success" && "border-[#BBF7D0] text-[#166534]",
              t.variant === "error" && "border-[#FECACA] text-[#991B1B]",
              t.variant === "warning" && "border-[#FDE68A] text-[#92400E]",
              t.variant === "info" && "border-[#E5E5E3] text-[#0A0A0A]",
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => uiStore.dismissToast(t.id)}
              className="text-current/70 hover:text-current"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
