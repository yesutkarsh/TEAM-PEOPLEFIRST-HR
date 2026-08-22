# Phases

| Phase | Scope |
| ----- | ----- |
| 1 | Foundation + Tenant onboarding + Theming system |
| 2 | Super Admin dashboard + Tenant management portal |
| 3 | HR Admin — Employee profile management (create, view, edit) |
| 4 | Role-based access control UI + Permission matrix |
| 5 | Leave management — Admin config + Employee requests + Approvals |
| 6 | Attendance & time tracking — Clock-in/out + Manager views |
| 7 | Payroll — Salary structures + Payroll run + Pay slip viewer |
| 8 | Performance management — Goals (OKR/KRA) + Review cycles |
| 9 | Employee self-service portal — Full ESS dashboard |
| 10 | Analytics + Reporting + AI features (chatbot, anomaly flags) |

## Phase 1 in detail

Delivered:
- `/onboarding`, `/onboarding/brand`, `/onboarding/admin`,
  `/onboarding/review` — full 4-step wizard with persistence across steps
  (browser back works correctly).
- `/login` — credential sign in, restores tenant theme on success.
- `/dashboard` — auth-guarded placeholder under tenant theme.
- `/settings/company` — post-onboarding theme editor.
- `lib/themes/` — WCAG-contrast utilities + runtime CSS-var application.
- 13 `ui/` primitives, 3 `forms/` composites, 4 `layout/` chrome pieces,
  3 `onboarding/` step components.
- `tenant`, `auth`, `ui`, `onboarding` reactive stores (localStorage backed).
- Mocked `lib/api/` modules — same shape Phase 2+ will keep.

Not in Phase 1:
- Employee directory or profiles (Phase 3)
- Additional sidebar navigation (Phase 2)
- Payroll / leave / attendance / performance UI (Phases 5–8)
- Email verification, password reset (Phase 2)
- MFA (Phase 4)
- Super admin tenant management (Phase 2)
## Phase 2 — Super Admin Portal + HR Dashboard + Company Settings

Delivered:

### Super Admin Portal (`/admin/*`)
- `_admin` route group — Default Theme locked, separate auth via `adminAuthStore`.
- `/admin/login` — platform admin auth (demo: `admin@hrms.platform` / `platform2026`).
- `/admin/dashboard` — `PlatformMetricGrid` + `TenantTable` with search, status filter, sort, pagination.
- `/admin/tenants` — full tenants list.
- `/admin/tenants/new` — manual tenant creation with plan + trial fields.
- `/admin/tenants/$tenantId` — two-column detail with Overview / Activity log / Settings tabs.
- `/admin/settings` — platform branding, onboarding defaults, danger zone (clear test tenants).
- Impersonation — start from tenant action menu or detail page; persistent `ImpersonationBanner` on every `_app` route until exited.

### HR Admin Dashboard (`/dashboard`)
- Greeting + date header.
- `QuickActionsBar` with locked future actions surfacing tooltips + toasts.
- `HRMetricGrid` — 4 KPI cards with tenant accent border.
- `PendingApprovalsWidget` — approve/decline with `ConfirmDialog`, optimistic removal, metric resync.
- `TeamCalendarWidget`, `UpcomingEventsWidget`, `RecentActivityFeed`.

### Sidebar Rewrite
- Grouped nav (Main / Reports & AI / Administration).
- Locked items dimmed with phase tooltip.
- Settings submenu expands; active item gets tenant primary 3px rail + 10% tint.
- Collapsible to 64px icon strip.

### Company Settings
- `_app.settings` layout with `SettingsSidebar`.
- Departments — full CRUD via `SlideOver`, delete warns if employees exist.
- Designations — CRUD with grade + multi-department selection.
- Work Calendar — visual day picker (auto-saves) + shift CRUD.
- Holidays — Tabs: National (toggle per country) + Company (CRUD).

### New Components
- `DataTable` (sortable, skeleton, empty slot)
- `StatCard`, `StatusDot`, `EmptyState`
- `ConfirmDialog`, `SlideOver`
- `Tabs` (arrow-key nav), `Breadcrumb`
- `showToast()` imperative helper + warning variant

### Architectural Adaptations
- Spec referenced Next.js App Router (`loading.tsx`, Server Actions, route groups). Project is TanStack Start, so:
  - Loading/error UIs use route-level `pendingComponent` / `errorComponent` and inline skeletons.
  - "Server Actions" → mock APIs in `src/lib/api/*` writing to `localStorage`.
  - Route groups use TanStack pathless layouts (`_admin`, `_app`, `_platform`) with dot-segment children.
  - `head()` on each route supplies Phase 2 page titles.

## MVP1 complete
MVP1 complete as of Phase 10. All ten phases delivered: Foundation & Theming,
Super Admin & HR Dashboard, Employee Lifecycle, RBAC, Leave, Attendance, Payroll,
Performance, Employee Self-Service, and Reports & AI. Future phases (11+) are
post-MVP1 scope.
