/** Common formatters used across the HRMS app. */
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Indian Rupee formatter — manual lakh/crore grouping (Intl 'en-IN' is inconsistent
 * across browsers). 1500 → ₹1,500 · 100000 → ₹1,00,000 · 1250000 → ₹12,50,000
 */
export function formatCurrency(amount: number | null | undefined, opts: { decimals?: boolean } = {}): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const negative = n < 0;
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const fraction = opts.decimals ? (abs - whole).toFixed(2).slice(1) : "";
  return `${negative ? "-" : ""}₹${groupIndian(whole)}${fraction}`;
}

/** Groups a non-negative integer with the Indian number system. */
export function groupIndian(value: number): string {
  const s = String(Math.floor(Math.abs(value)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

/** Parses user input like "₹1,20,000" back into a number. Returns null when empty/invalid. */
export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

/** Compact relative time — "just now", "3h ago", "2d ago", else a short date. */
export function relativeTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - d.getTime();
  if (!Number.isFinite(diff)) return "";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}