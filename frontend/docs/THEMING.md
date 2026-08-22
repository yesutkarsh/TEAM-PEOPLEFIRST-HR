# Theming

HRMS has **two** visual contexts. Use the right one or the system breaks.

## 1. Platform context (Default Theme, always)

Used by `/onboarding/*` and `/login`. These pages must look the same for
every visitor — they exist *before* a tenant is loaded.

Use the hardcoded HRMS palette (`#0A0A0A`, `#F97316`, `#F2F2F0`, …) or the
`--color-hrms-*` CSS variables. **Never** reference `--tenant-*` here.

## 2. Tenant context (runtime CSS variables)

Used by everything under `/_app/*`. The current tenant's colors are
injected onto `<html>` as:

| Variable                       | Use for                                       |
| ------------------------------ | --------------------------------------------- |
| `--tenant-primary`             | Primary buttons, active nav, links            |
| `--tenant-primary-hover`       | Hover state of primary surfaces (10% darker)  |
| `--tenant-secondary`           | Sidebar bg, subtle fills, panel backgrounds   |
| `--tenant-accent`              | Badges, highlights, notifications             |
| `--tenant-text-on-primary`     | Foreground text on primary surfaces           |
| `--tenant-text-on-secondary`   | Foreground text on secondary surfaces         |

Application happens in `_app.tsx`:

```ts
useEffect(() => applyTenantTheme(theme), [theme]);
```

`resetToDefaultTheme()` is called on logout.

## How to build a new tenant-themed component

**Bad** — hardcoded brand color, will not change with tenant:
```tsx
<button className="bg-blue-600 text-white">Save</button>
```

**Good** — references the runtime variable via Tailwind arbitrary value:
```tsx
<button className="bg-[var(--tenant-primary)] text-[var(--tenant-text-on-primary)]">
  Save
</button>
```

Or use the `Button` component with `variant="tenant"`.

## Hard rule

Never write a tenant-context component with a hardcoded color literal.
Run a grep for `text-blue-`, `bg-indigo-`, `#3B82F6`, etc. before
merging any new screen.

## Testing themes

1. Sign up with the default colors. Confirm the dashboard is dark-on-light.
2. Sign in, go to `/settings/company`, and pick e.g. primary `#7C3AED`,
   secondary `#1F2937`, accent `#22D3EE`. Save.
3. Reload — the theme should persist (it lives in `tenantStore` ←
   `localStorage`).
4. Logout — `/login` must return to the Default Theme instantly.

## WCAG contrast helper

`computeTextColor(hex)` returns `#0A0A0A` or `#FFFFFF` based on the WCAG
relative-luminance formula. We pick black when its contrast ratio against
the background is ≥ 4.5:1 — i.e. it passes AA for body text.