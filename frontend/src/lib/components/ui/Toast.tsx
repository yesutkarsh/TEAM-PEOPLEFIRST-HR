/** Imperative toast helper. Toasts render in <ToastViewport />. */
import { uiStore } from "@/lib/store/ui";

export type ToastVariant = "success" | "error" | "warning" | "info";

export function showToast(message: string, variant: ToastVariant = "info") {
  uiStore.pushToast({ message, variant });
}
