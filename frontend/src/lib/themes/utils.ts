/**
 * Theme color utilities: contrast computation, hex math, and runtime
 * application of tenant CSS variables to <html>.
 *
 * No external color libraries — keeps the bundle small and the math
 * deterministic.
 */
import type { TenantTheme } from "./types";
import { DEFAULT_THEME } from "./defaults";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colors (per WCAG). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Picks black or white text for the given background.
 * Returns black when its contrast against the bg is ≥ 4.5:1, else white.
 */
export function computeTextColor(bgHex: string): "#0A0A0A" | "#FFFFFF" {
  if (!isValidHex(bgHex)) return "#FFFFFF";
  const black = contrastRatio(bgHex, "#0A0A0A");
  return black >= 4.5 ? "#0A0A0A" : "#FFFFFF";
}

/** Darken a hex color by `amount` (0–1, e.g. 0.1 = 10%). */
export function darkenColor(hex: string, amount: number): string {
  if (!isValidHex(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

/** Lighten a hex color by `amount` (0–1). */
export function lightenColor(hex: string, amount: number): string {
  if (!isValidHex(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

/** Build a fully-resolved theme from arbitrary primary/secondary/accent input. */
export function buildTheme(input: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): TenantTheme {
  return {
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    accentColor: input.accentColor,
    textOnPrimary: computeTextColor(input.primaryColor),
    textOnSecondary: computeTextColor(input.secondaryColor),
  };
}

const TENANT_VARS = [
  "--tenant-primary",
  "--tenant-primary-hover",
  "--tenant-secondary",
  "--tenant-accent",
  "--tenant-text-on-primary",
  "--tenant-text-on-secondary",
] as const;

/** Applies a tenant theme by setting CSS custom properties on <html>. */
export function applyTenantTheme(theme: TenantTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--tenant-primary", theme.primaryColor);
  root.style.setProperty("--tenant-primary-hover", darkenColor(theme.primaryColor, 0.1));
  root.style.setProperty("--tenant-secondary", theme.secondaryColor);
  root.style.setProperty("--tenant-accent", theme.accentColor);
  root.style.setProperty("--tenant-text-on-primary", theme.textOnPrimary);
  root.style.setProperty("--tenant-text-on-secondary", theme.textOnSecondary);
}

/** Removes all tenant theme overrides (reverts to default theme via :root). */
export function resetToDefaultTheme(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const v of TENANT_VARS) root.style.removeProperty(v);
  applyTenantTheme(DEFAULT_THEME);
}