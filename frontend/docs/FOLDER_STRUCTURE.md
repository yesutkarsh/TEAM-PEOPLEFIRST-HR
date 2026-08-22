# Folder structure

```
src/
├── routes/                  TanStack Start file-based routes
│   ├── _platform.*          Onboarding + login (Default Theme, no chrome)
│   └── _app.*               Authenticated shell (tenant theme + sidebar)
│
└── lib/
    ├── components/
    │   ├── ui/              Stateless reusable primitives
    │   ├── layout/          Sidebar, TopBar, PageHeader, SectionLabel
    │   ├── forms/           Composed form-level: FormField, ColorPicker, LogoUpload
    │   └── onboarding/      Wizard-only: StepIndicator, StepCard, ThemePreview
    ├── themes/              Default theme, TenantTheme, contrast utilities
    ├── store/               tenant / auth / ui / onboarding (browser-persisted)
    ├── api/                 Typed { data, error } modules (mocked in Phase 1)
    ├── utils/               cn, format, validation
    └── types/               tenant, user, api
```

## Why platform and app routes are separate groups

They have completely different chrome, theming, and auth requirements.
Keeping them in `_platform.*` vs `_app.*` means:

- A bug in tenant theming can never break onboarding.
- The auth guard only runs on `_app.*` — onboarding stays public.
- Each shell is responsible for *applying* its own theme on mount.

## What belongs where

- **`ui/`** — Stateless primitives. Accept `className` (always last), no
  business logic, no API calls, no store imports.
- **`forms/`** — Composed form pieces that may render multiple inputs and
  manage their own internal UI state.
- **`layout/`** — Page-level chrome (Sidebar, TopBar, PageHeader).
- **`onboarding/`** — Components specific to the onboarding wizard. Move
  them out of `onboarding/` only if a second feature genuinely reuses them.

## Barrel exports

Every component folder exposes an `index.ts` that re-exports the public
API. Import from the folder, not the file:

```ts
import { Button, Card } from "@/lib/components/ui";
```

This keeps refactors local — renaming a file doesn't ripple through
callers.

## API layer pattern

Every API module exports an object of methods. Each method returns
`Promise<ApiResponse<T>>`. Components never `try/catch` API calls — they
match on `res.error`.

## Store naming

`tenantStore`, `authStore`, `uiStore`, `onboardingStore`. Always singular
camelCase + `Store` suffix. Subscribe with `store.useSelector(s => ...)`.

## Import aliases

Use the `@/` alias for all `src/` imports. Avoid deep relative paths
(`../../../`).
## Phase 2 additions

```
src/lib/components/
├── ui/
│   ├── DataTable.tsx        # sortable table primitive
│   ├── StatCard.tsx         # KPI card with accent border
│   ├── EmptyState.tsx       # zero-data state
│   ├── ConfirmDialog.tsx    # destructive confirmation modal
│   ├── SlideOver.tsx        # right-anchored form panel
│   ├── Tabs.tsx             # accessible tab group
│   ├── Breadcrumb.tsx       # location trail
│   ├── StatusDot.tsx        # status indicator
│   └── Toast.tsx            # showToast() helper
├── layout/
│   ├── AdminSidebar.tsx     # super admin nav (always Default Theme)
│   ├── SettingsSidebar.tsx  # secondary sidebar inside /settings
│   └── ImpersonationBanner.tsx
├── dashboard/               # HR dashboard widgets
└── superadmin/              # Platform widgets (TenantTable etc.)

src/lib/api/
├── admin.ts        # platform metrics, tenant CRUD, impersonation, settings
├── settings.ts     # departments, designations, work calendar, holidays
└── dashboard.ts    # HR metrics, approvals, leave, events, activity

src/lib/types/
├── admin.ts        # TenantSummary, TenantStatus, PlatformMetrics
└── dashboard.ts    # HRMetrics, PendingApproval, ActivityItem

src/routes/
├── _admin.tsx                        # super admin layout (Default Theme + AdminSidebar)
├── _admin.admin.login.tsx            # /admin/login
├── _admin.admin.dashboard.tsx        # /admin/dashboard
├── _admin.admin.tenants.tsx          # /admin/tenants
├── _admin.admin.tenants.new.tsx      # /admin/tenants/new
├── _admin.admin.tenants.$tenantId.tsx
├── _admin.admin.settings.tsx
├── _app.settings.tsx                 # SettingsSidebar layout for /settings/*
├── _app.settings.company.departments.tsx
├── _app.settings.company.designations.tsx
├── _app.settings.company.work-calendar.tsx
└── _app.settings.company.holidays.tsx
```

`_admin` is a pathless layout (no URL prefix); children declare `/admin/...` paths via dot-segments. Same pattern as `_app` and `_platform`.

## Phase 3 additions

- `src/lib/components/employees/` — directory + profile UI atoms (avatar,
  status badge, cards, filters, header, document vault, status menu).
- `src/lib/components/org-chart/` — self-contained interactive tree, controls,
  and node card.
- `src/lib/components/forms/employee/` — multi-step add/edit form pieces; each
  step exports its own `validateXxx()` so the parent route can compose them.
- `src/lib/api/employees.ts` — all employee CRUD against localStorage.
- `src/lib/types/employee.ts` — Employee, EmployeeDocument, EmploymentStatus,
  TimelineEntry, EmployeeFilters.


## Phase 4 — RBAC

- `src/lib/types/permissions.ts`, `src/lib/types/rbac.ts`
- `src/lib/api/rbac.ts` — single localStorage-backed RBAC API
- `src/lib/store/rbac.ts` — effective-permissions store, refresh on auth changes
- `src/lib/hooks/` — `usePermission.ts`, `useRole.ts` (new hooks folder)
- `src/lib/components/rbac/` — RBAC presentational + composite components
- `src/routes/_app.settings.roles*` — Roles list/detail/new/edit, Assignments, Delegation, Audit Log


## Phase 10 additions
- `src/lib/components/reports/` — KPI grid, report tiles, SVG charts, report table,
  filter/field pickers, export menu, natural-language query bar.
- `src/lib/components/ai/` — chat panel and its parts, AI badge, anomaly and risk
  cards, OCR review, document draft modal.
- `src/lib/api/ai.ts` (stateful chat sessions, anomalies, OCR, drafts) is separate
  from `src/lib/api/reports.ts` (one-shot NL query → report config, standard reports).
  Both are "AI-powered" but have different lifecycles and failure modes.
- AI features extend existing pages (payroll run detail, attendance team/admin,
  add-employee documents step, employee profile, helpdesk tickets) rather than living
  as standalone routes. Future phases should follow this extension pattern.
