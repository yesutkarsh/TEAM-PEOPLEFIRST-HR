/** Pure attendance helpers — IP allow-lists, geo fences, time math. */
import type { AttendanceLocation, GeoFence } from "../types/attendance";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseHHmm(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toHHmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

/** 545 → "9h 05m". Always positive-formatted. */
export function formatMinutes(minutes: number): string {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${pad2(m)}m`;
}

export function formatClock(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function minutesBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

// ───────────────────────── IP allow-list ─────────────────────────

function ipToLong(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = out * 256 + n;
  }
  return out >>> 0;
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  if (ipLong === null || rangeLong === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

export function isIpAllowed(ip: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  return allowed.some((entry) => ipInCidr(ip, entry.trim()));
}

// ───────────────────────── geo fencing ─────────────────────────

export function haversineMeters(a: AttendanceLocation, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export function findGeoFence(loc: AttendanceLocation, fences: GeoFence[]): GeoFence | null {
  for (const f of fences) {
    if (haversineMeters(loc, f) <= f.radiusMeters) return f;
  }
  return null;
}

export function isWithinGeoFence(loc: AttendanceLocation, fences: GeoFence[]): boolean {
  if (!fences.length) return true;
  return findGeoFence(loc, fences) !== null;
}

/** Browser geolocation wrapped in a promise. Resolves null when unavailable/denied. */
export function getCurrentPosition(timeoutMs = 6000): Promise<AttendanceLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}