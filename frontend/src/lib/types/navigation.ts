/** Phase 12 — data-driven sidebar configuration types. */

export type SidebarItemKind = "built_in" | "custom_top_level" | "custom_form_link";

export type SidebarSectionKey = "main" | "reports_ai" | "administration" | "custom";

export interface SidebarItemConfig {
  id: string;
  kind: SidebarItemKind;
  label: string;
  /** Lucide icon name — only used for custom_top_level items. */
  icon?: string;
  /** Set for sub-nav items; undefined for top-level items. */
  parentId?: string;
  /** Only present on custom_form_link items. */
  linkedFormId?: string;
  /** Built-in items only — their existing hardcoded route. Never user-editable. */
  basePath?: string;
  sectionKey: SidebarSectionKey;
  displayOrder: number;
  /** Role IDs (built-in + custom roles from Phase 4). */
  allowedRoleIds: string[];
  /** Explicit override — hides regardless of allowedRoleIds. */
  isHidden: boolean;
}

export const SECTION_LABELS: Record<SidebarSectionKey, string> = {
  main: "Main",
  reports_ai: "Reports & AI",
  administration: "Administration",
  custom: "Custom",
};
