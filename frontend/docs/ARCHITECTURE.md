# Architecture

HRMS is a multi-tenant SaaS frontend built on TanStack Start with strict
TypeScript. Phase 1 ships the foundation: theming, onboarding, and an
authenticated app shell. There is no real backend in Phase 1 — all data is
mocked through a `lib/api/` layer that resolves against `localStorage`.

## Request lifecycle

```
UI Component
  └─> lib/api/<module> (typed: returns { data, error })
        └─> base client (delay + storage in Phase 1; HTTP fetch in Phase 2+)
              └─> Browser localStorage
```

API modules never throw; every call returns `ApiResponse<T>`. Components
match on `res.error` and surface inline errors. On 401 the base client will
(in Phase 2+) clear session state and redirect to `/login`.

## Auth flow

1. The Onboarding wizard calls `tenantsApi.create()` then
   `authApi.register()`.
2. On success the tenant + user are persisted to `localStorage` and the
   tenant theme is applied to `<html>`.
3. `/login` resolves credentials and re-hydrates both stores.
4. `/_app` is the auth-guarded layout — any route nested under it
   redirects to `/login` if no user is present.
5. Logout clears both stores and calls `resetToDefaultTheme()`.

## Tenant context loading

`lib/store/tenant.ts` is initialized from `localStorage` synchronously, so
the very first render of `/_app/*` already has the correct theme.
`AppLayout` re-applies the theme reactively whenever the store changes —
the theme editor at `/settings/company` therefore takes effect instantly.

## Route groups

- `_platform.*` — onboarding + login. Always Default Theme. No sidebar.
- `_app.*` — every authenticated screen. Tenant theme + sidebar + topbar.

The two groups are isolated so a tenant's brand colors can never bleed
into onboarding or login.

## Error handling

- Validation errors are rendered inline next to the input.
- API errors render as a dismissible `Alert` at the top of the form.
- 5xx-equivalent failures collapse to the safe string
  "Something went wrong. Please try again."
- Toasts are reserved for global, non-blocking confirmations.
## Phase 2 — Super Admin & Impersonation

### Route groups
- `_admin.tsx` — super admin shell. Resets tenant CSS vars, mounts `AdminSidebar`, guards children via `adminAuthStore`. `/admin/login` renders bare (no sidebar).
- `_app.settings.tsx` — secondary layout that mounts `SettingsSidebar` next to the page outlet. `beforeLoad` redirects `/settings` → `/settings/company`.

### Auth stores
- `authStore` — tenant user session.
- `adminAuthStore` — platform admin session (separate token + name). Never mixed with tenant sessions.
- `impersonationStateStore` — wrapped `{ current: Impersonation | null }` to satisfy the `createStore<T extends object>` contract. Persisted to `hrms.impersonation`.

### Impersonation flow
1. Super admin clicks **Impersonate** in `TenantTable` or tenant detail.
2. `impersonationStateStore.start(tenantId, companyName)` persists the token + navigates to `/dashboard`.
3. `_app.tsx` reads `impersonationStateStore.current` and renders `<ImpersonationBanner />` above `<TopBar>`.
4. Banner's **Exit impersonation** calls `impersonationStateStore.stop()` and routes back to `/admin/dashboard`.
5. The banner does not appear in the normal tenant session (gated on `current !== null`).

### Server vs client distinction
This project is TanStack Start, frontend-only. Phase 2 spec's "Server Components / Server Actions" maps to:
- Initial data: fetched in route components via `useEffect` against mock APIs (`src/lib/api/*`) that resolve from `localStorage` with a synthetic delay. Loading states use route-local skeletons.
- Mutations: same mock APIs, with optimistic UI where useful (approvals, status changes) and `ConfirmDialog` gates for destructive actions.

### SlideOver settings pattern
All settings CRUD (Departments, Designations, Shifts, Company Holidays) opens a right-anchored `SlideOver` rather than a separate route. State lives in the page; on save the API persists, the panel closes, and the list reloads.

## Phase 3 additions

- **5-step add employee flow** — single route (`/employees/new`) using internal
  step state; draft and current step persisted to `sessionStorage` so reloads
  inside the flow do not lose data.
- **Document staging** — uploaded files are kept in the in-memory `EmployeeDraft`
  until final submit, where they are committed via `createEmployee`.
- **Masked fields** — Aadhaar is masked as `XXXX XXXX 1234` on the way in via the
  `maskAadhaar` helper; bank account numbers display as `XXXXXX####` on read.
- **Filter state** — the directory keeps filter state in component state for
  Phase 3; URL-search-param sync ships in a later iteration without changing
  the API surface of `EmployeeSearchFilters`.
- **Profile completeness** — `computeCompleteness(employee)` runs server-side
  (mock API) on every read/write so the bar always reflects the freshest data.


## Phase 4 — RBAC

- `lib/types/permissions.ts` — `PERMISSIONS` constant + `PermissionKey` + module groups + scope catalogs.
- `lib/types/rbac.ts` — `Role`, `PermissionEntry`, `UserRoleAssignment`, `Delegation`, `PermissionAuditEntry`, built-in role IDs.
- `lib/api/rbac.ts` — localStorage backed; seeds 3 built-in roles; CRUD for roles/assignments/delegations; audit log autoappend; `getEffectivePermissionsSync` merges role + active delegations.
- `lib/store/rbac.ts` — reactive store of current user's effective permissions, hydrated by `authStore.signIn` and on `_app` mount.
- `lib/hooks/usePermission.ts`, `useRole.ts` — sync, memoised permission/role checks.
- `lib/components/rbac/` — `PermissionGuard`, `RoleBadge`, `RoleCard`, `PermissionMatrix` (group → toggle → scope), `RoleAssignmentRow`, `DelegationCard`, `AuditLogRow`, `EmployeeAccessTab`.
- `lib/components/ui/` — new `Toggle`, `RadioGroup`, `InfoTooltip`.
- Routes: `/settings/roles`, `/new`, `/:roleId`, `/:roleId/edit`, `/assignments`, `/delegation`, `/audit` (TanStack file-route layout at `_app.settings.roles.tsx` with subnav + view gate).
- Sidebar + SettingsSidebar now hide nav items the user can't access (`usePermission` per item); locked future-phase items still show dimmed.
- Route protection is enforced at the layout level via `PermissionGuard` (TanStack Start has no Next.js-style middleware; the layout fallback replaces page content).
- Employee profile gained an "Access" tab implementing role change, active delegation viewing, and effective permission summary.


## Phase 10 — Reports & AI

### AI chat surface: TopBar trigger, not a floating bubble
AI chat is reached from a quiet "Ask AI" button in the TopBar, styled exactly like
the Phase 9 NotificationBell. It opens a 400px right slide-in panel (SlideOver
mechanics and 250ms timing, but its own component because chat needs persistent
scroll position). A floating round bubble in the corner was deliberately rejected:
it signals "bolted-on third-party widget", which is the opposite of an AI capability
that is native to the product.

### Chat session persistence
Conversations are per employee and survive navigation and re-login (mocked in
browser storage here; server-stored for 90 days in production). The panel opens the
most recent session. "Clear conversation" is destructive and always passes through a
ConfirmDialog.

### Three AI surfaces, three intents
- **AI chat** — open-ended, conversational, stateful.
- **Natural language report bar** — one-shot query → structured report config. It is
  a shortcut *into* the builder, never a dead end.
- **Custom report builder** — explicit, structured, saveable.
They are intentionally not merged: different lifecycles, different backends
(`lib/api/ai.ts` vs `lib/api/reports.ts`), different failure modes.

### Role scoping
Employee = own data, Manager = team aggregates, HR Admin = company-wide. The
frontend never assumes scope — it renders whatever the (server-enforced) scope
returns, and never offers affordances for data the role cannot see.

### Human-review gate on generated documents
DocumentDraftModal keeps "Download PDF" and "Send to employee" disabled until the
reviewer ticks "I have reviewed this draft and confirm it is accurate." This is a
hard requirement regardless of how confident the draft looks.

### Anomaly / risk flag lifecycle
open → dismissed (with a required reason, min 10 chars) → retained in a collapsed
"Dismissed" section. Flags are never silently cleared or deleted, and never block
payroll finalisation — only Phase 7's rule-based errors do that.

### Multi-tenant isolation
AI and report requests rely solely on the tenant context established at login. No
Phase 10 component passes a tenant identifier from a form field or URL parameter.

### Navigation feedback
Route changes render a 2px tenant-primary top progress bar (`RouteProgress`) plus a
140ms fade/rise on the page body (`RouteTransition`), with `defaultPreload: "intent"`
on the router so pages are usually already loaded by the time the click lands.
