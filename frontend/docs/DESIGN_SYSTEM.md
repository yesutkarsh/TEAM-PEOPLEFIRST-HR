# Modern Enterprise Bento Design System

> **Design Directive for Project Northstar HRMS**  
> This document defines the authoritative design language, UI guidelines, color palettes, typography, bento layout standards, and component code patterns for creating modern, minimal, and visually compelling enterprise interfaces.

---

## 🎨 Design Philosophy & Principles

1. **Modern Enterprise Aesthetics**: Blend high-clarity enterprise information density with a fresh, youthful tech visual style.
2. **Asymmetrical Bento Grid Layout**: Use modular bento tiles with varied heights, high-contrast dark/light card combinations, and smooth rounded corners (`rounded-2xl` / `rounded-3xl`).
3. **Typography First**: Bold display headers, extra-large tabular numbers (`36px` to `56px`), crisp uppercase labels with wide letter-spacing (`tracking-[0.1em]`), and lining/tabular numerical alignment.
4. **Slant Action Triggers (`↗`)**: Use slant action arrows (`ArrowUpRight` or `↗`) for actionable cards, links, and shortcut pills to give an energetic, responsive feel.
5. **Micro-Visualizations over Plain Numbers**: Pair static key metrics with mini bar graphs, live pulse dots, progress target meters, or status percentage chips.

---

## 🖤 Color System & Palette

| Token | Hex / Class | Usage |
| :--- | :--- | :--- |
| **Obsidian Dark** | `#111111` / `#0A0A0A` | Header backgrounds, primary hero dark bento callout cards, primary buttons |
| **Warm Off-White Surface** | `#F9F9F7` / `#FAFAF9` | App background, subtle table rows, header backdrop fills |
| **Pure White** | `#FFFFFF` | Bento card containers, modal dialogs, standard stat cards |
| **Borders** | `#E5E5E3` / `#F2F2F0` | Subtle borders (`border border-[#E5E5E3]`), divider lines |
| **Vibrant Orange Accent** | `#F97316` / `orange-500` | Highlights, active glow blurs, energetic callout pins |
| **Emerald Active** | `#10B981` / `emerald-600` | Active status dots, positive trends, approved badges |
| **Amber Warning** | `#F59E0B` / `amber-600` | On-break badges, pending action hints |
| **Rose Alert** | `#F43F5E` / `rose-600` | Check out actions, declined states, overdue items |

---

## 📐 Layout & Bento Grid Architecture

### Page Structure
- **Container**: `max-w-7xl mx-auto space-y-6 sm:space-y-7 pb-12`
- **Grid Ratio**: 5-column responsive bento layout (`grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6`)
  - **Left Section (3 Cols)**: Urgent action widgets (Pending Approvals, Live Activity Feed)
  - **Right Section (2 Cols)**: Contextual schedules (Team Calendar, Upcoming Events, Balances)

### Corner Radius System
- `rounded-3xl`: Hero surfaces (Page Header, Clock In / Attendance Bento Tile)
- `rounded-2xl`: Metric Stat Cards, List Widgets, Quick Action Cards
- `rounded-xl`: Action buttons, pill badges, avatar containers

---

## 🔤 Typography & Hierarchy Standards

```tsx
// Page Header Title
<h1 className="text-[28px] sm:text-[38px] font-extrabold tracking-tight text-white font-sans">
  Good morning, Alex.
</h1>

// Hero KPI Display Number
<span className="text-[44px] sm:text-[56px] leading-none font-bold tracking-tight text-[#0A0A0A] font-sans tabular-nums">
  06h 45m
</span>

// Category Label
<p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8E8E8E]">
  Total Workforce
</p>
```

---

## ⚡ Key Bento Component Patterns

### 1. Bento Stat Card with Dark Callout (`StatCard.tsx`)
```tsx
<StatCard
  label="Pending approvals"
  value={metrics.pendingApprovals}
  trend={metrics.pendingApprovalsNote}
  variant={metrics.pendingApprovals > 0 ? "dark" : "default"}
  actionHint
  icon={<Bell className="w-4 h-4" />}
>
  <div className="mt-1 flex items-center gap-2">
    <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
    <span className="text-[11px] font-medium text-neutral-300">
      Requires manager decision
    </span>
  </div>
</StatCard>
```

### 2. Header Bento Banner with Glass Quick-Pills
```tsx
<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white shadow-md relative overflow-hidden">
  <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
  <div className="relative z-10 min-w-0">
    <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-neutral-200 border border-white/15 backdrop-blur-md">
        <Sparkles className="w-3 h-3 text-orange-400" />
        Acme Corp HR Portal
      </span>
    </div>
    <h1 className="text-[28px] sm:text-[38px] font-extrabold tracking-tight text-white font-sans">
      Good morning, Sarah.
    </h1>
  </div>
  <div className="relative z-10 flex flex-wrap items-center gap-2">
    <Link to="/leave/apply" className="group inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all active:scale-95">
      Apply for leave
      <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
    </Link>
  </div>
</header>
```

### 3. List Widget Container Pattern
```tsx
<div className="rounded-2xl border border-[#E5E5E3] bg-white p-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
  <div className="px-5 py-4 border-b border-[#F2F2F0] flex items-center justify-between bg-[#FAFAF9]">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-orange-500" />
      <h3 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight">Widget Title</h3>
    </div>
    <button className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A0A0A] hover:text-orange-600 transition-colors group">
      View all
      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  </div>
  <ul className="divide-y divide-[#F4F4F2]">
    {/* List Items */}
  </ul>
</div>
```

---

## 🛠 Rule for AI Assistants / Developers

When creating or modifying ANY user interface page or widget in this repository:
1. Always follow the **Modern Enterprise Bento Design System** defined in this document.
2. Use `rounded-2xl` for standard card widgets and `rounded-3xl` for hero surfaces.
3. Use high-contrast obsidian dark callout tiles (`variant="dark"` or `bg-[#111111]`) to draw immediate visual attention to urgent actions or key highlights.
4. Include slant arrows (`ArrowUpRight` or `↗`) on interactive action links & shortcut pills.
5. Ensure numbers use tabular digits (`tabular-nums`) and tight letter-spacing (`tracking-tight`).
