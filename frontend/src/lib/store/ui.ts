/** UI state — sidebar, active modal, toast queue, AI panel. */
import { createStore } from "./createStore";

export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
}

interface UiState {
  sidebarOpen: boolean;
  activeModalId: string | null;
  toasts: Toast[];
  aiPanelOpen: boolean;
}

const store = createStore<UiState>({
  sidebarOpen: true,
  activeModalId: null,
  toasts: [],
  aiPanelOpen: false,
});

export const uiStore = {
  ...store,
  toggleSidebar() {
    store.set((s) => ({ sidebarOpen: !s.sidebarOpen }));
  },
  openModal(id: string) {
    store.set({ activeModalId: id });
  },
  closeModal() {
    store.set({ activeModalId: null });
  },
  pushToast(t: Omit<Toast, "id">) {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    store.set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => {
      store.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3500);
  },
  dismissToast(id: string) {
    store.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
  openAiPanel() {
    store.set({ aiPanelOpen: true });
  },
  closeAiPanel() {
    store.set({ aiPanelOpen: false });
  },
  toggleAiPanel() {
    store.set((s) => ({ aiPanelOpen: !s.aiPanelOpen }));
  },
  openSearch() {
    store.set({ activeModalId: "search" });
  },
  closeSearch() {
    store.set({ activeModalId: null });
  },
  toggleSearch() {
    store.set((s) => ({ activeModalId: s.activeModalId === "search" ? null : "search" }));
  },
};
