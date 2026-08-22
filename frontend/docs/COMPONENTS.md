# Components

## API design rules

1. **Typed props over options bags.** Every prop is a named field on the
   `Props` interface — no `{ options: any }`.
2. **`className` always last.** Every component accepts an optional
   `className` as the last prop, merged via `cn()`.
3. **Theme-aware vs theme-agnostic.** A theme-agnostic component (`Input`,
   `Card`) hardcodes the default HRMS palette and works in both contexts.
   A theme-aware component (`Button variant="tenant"`, `Avatar`,
   `Sidebar`) reads `--tenant-*` CSS vars.

## The `cn()` utility

```ts
import { cn } from "@/lib/utils";

<div className={cn("base classes", isActive && "active", className)} />
```

It merges `clsx` semantics (conditionals) with `tailwind-merge`
(deduplicates conflicting Tailwind classes). Always use it when composing
a `className` prop.

## Phase 1 components

### Button
`variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'tenant'`,
`size: 'sm' | 'md' | 'lg'`, `loading`, `disabled`, optional
`leadingIcon` / `trailingIcon`. Loading state swaps content for a spinner
but keeps the click target stable.

```tsx
<Button variant="tenant" size="lg" loading={saving}>Save</Button>
```

Accessibility: native `<button>`, focus ring on `focus-visible`.

### Input
Label + control + (`error` | `hint`). Errors render in an `aria-live`
region so screen readers announce them.

### Select / Textarea / Checkbox
Same label + error pattern as `Input`. `Checkbox` accepts a `ReactNode`
label so we can embed links (e.g. "I agree to the Terms…").

### Badge
Pill, uppercase 11px / 0.08em tracking. Variants: `default`, `accent`,
`tenant-accent`, `success`, `warning`, `danger`.

### Card
8px radius surface with a 1px border and a subtle 1px shadow.
`padded={false}` to opt out of internal padding.

### Avatar
Initials-based, theme-aware (uses `--tenant-primary`). Falls back to an
image if `src` is provided.

### Tooltip / Modal / Alert / Spinner
Used sparingly in Phase 1. `Modal` traps `Escape` and renders a backdrop
with a click-to-close affordance. `Alert` is dismissible when `onDismiss`
is provided.

### ColorPicker
Hex text input + native swatch. Both inputs stay in sync; invalid hex
values revert on blur.

### LogoUpload
Drag-drop + click. PNG/JPG/SVG only, max 2MB. Stores as a data URL —
Phase 1 only, will swap for object storage upload in Phase 2.

### StepIndicator / StepCard / ThemePreview
Onboarding-only. `ThemePreview` is a static 280×180 illustration of an
HRMS panel rendered with the provided primary/secondary/accent — used in
both the onboarding wizard and `/settings/company`.

## Accessibility checklist (Phase 1)

- Every input has a visible `<label>` (or an `aria-label`).
- Validation errors render in `aria-live="polite"` regions.
- Show/hide password toggle is keyboard-operable (Enter / Space).
- Buttons and links have visible focus rings.
- All animations are wrapped in `motion-reduce:` Tailwind variants.
## Phase 2 Components

### DataTable
`src/lib/components/ui/DataTable.tsx`

```ts
<DataTable
  columns={[{ key: "name", label: "Name", sortable: true, render: (row) => row.name }]}
  data={rows}
  loading={loading}
  sortKey="name" sortDir="asc"
  onSort={(key, dir) => ...}
  getRowKey={(r) => r.id}
  emptyState={<EmptyState title="No data" />}
/>
```
Sort cycle: unsorted → asc → desc → unsorted. Skeleton rows on `loading=true`.

### StatCard
KPI card with optional top accent border (`accent: "tenant" | "platform" | "none"`) and trend (`up` / `down` / `neutral`).

### EmptyState
Centered icon + title + subtitle + optional action.

### ConfirmDialog
Built on `Modal`. Variants: `default | warning | danger`. Confirm button shows spinner while `onConfirm` runs; Escape cancels; focus moves to confirm on open.

### SlideOver
Right-anchored panel with sticky footer slot, backdrop, Escape close, focus return.

### Tabs
`tabs: { id, label, content }[]`. Arrow / Home / End keys move between triggers; active gets tenant-primary 2px underline.

### Breadcrumb
`items: { label, to? }[]`. Last item rendered as current page (non-link).

### StatusDot
`tone: success | warning | danger | neutral | info`.

### showToast (Toast helper)
`showToast(message, variant?)` → pushes onto the global `uiStore` queue rendered by `ToastViewport`. Variants: `success | error | warning | info`.

### ImpersonationBanner
Persistent amber banner above `TopBar` when `impersonationStateStore.current` is set. Calls `impersonationStateStore.stop()` and navigates to `/admin/dashboard`.

### AdminSidebar / SettingsSidebar
- `AdminSidebar` — dark, Default Theme; platform nav (Dashboard / Tenants / Settings) + locked support items.
- `SettingsSidebar` — light secondary nav inside the `/settings` layout.

### Dashboard Widgets (`src/lib/components/dashboard/`)
- `HRMetricGrid({ metrics })`
- `QuickActionsBar` (self-contained)
- `PendingApprovalsWidget({ initial, onChange })`
- `TeamCalendarWidget({ items })`
- `UpcomingEventsWidget({ items })`
- `RecentActivityFeed({ items })`

### Super Admin Widgets (`src/lib/components/superadmin/`)
- `PlatformMetricGrid({ metrics })`
- `TenantTable({ data, loading, onChange })`
- `TenantStatusBadge({ status })`
- `TenantActionMenu({ actions })`

## Phase 3 additions

### UI primitives
- **FileUpload** — drag-drop + click; type/size validation; preview chip when a file is chosen.
- **DatePicker** — accessible native date input with min/max.
- **PhoneInput** — country-code select + tel input.
- **SearchInput** — debounced search with clear button (X).
- **MultiSelect** — checklist popover for multi-value filters.
- **ProgressBar** — horizontal bar (used for profile completeness).
- **ViewToggle** — list/grid segmented buttons.
- **StepForm** — multi-step shell driving `StepIndicator` + Back/Continue/Submit footer.

### Employee components (`components/employees/`)
EmployeeAvatar, EmployeeStatusBadge, EmployeeCard, EmployeeSearchFilters,
BulkActionsBar, ProfileCompletenessBar, ProfileHeader, DocumentVault,
DocumentItem, StatusTransitionMenu.

### Org chart (`components/org-chart/`)
OrgChart (recursive tree, collapsible), OrgNode (single card), OrgChartControls
(search + zoom + fit).

### Employee form steps (`components/forms/employee/`)
StepPersonal, StepProfessional, StepCompensation, StepDocuments, StepAccessReview
— each exports its own `validateXxx()` for the Add/Edit flow.


## Phase 4 additions

- `PermissionGuard` — wrap any UI to render only when the current user has the given permission(s); supports `any`/`all` mode and fallback.
- `Toggle` — accessible on/off pill switch; uses tenant primary color when on.
- `RadioGroup` — keyboard-navigable radio group with vertical/horizontal layout.
- `InfoTooltip` — "ⓘ" icon with hover/focus tooltip.
- `ScopeSelector` — Self/Team/Dept/All segmented selector for scoped permissions.
- `RoleBadge` / `RoleCard` — inline tag and full card for displaying roles.
- `PermissionMatrix` / `PermissionModuleGroup` / `PermissionToggle` — composable permission editor; readOnly for built-in roles.
- `RoleAssignmentRow` — SlideOver to reassign a single employee's role.
- `DelegationCard` — visualises a delegation with elapsed progress bar and status.
- `AuditLogRow` — color-coded audit-log table row.
- `EmployeeAccessTab` — Phase 4 implementation of the previously stubbed employee profile Access tab.

