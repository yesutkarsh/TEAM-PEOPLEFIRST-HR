/**
 * Base API client. Returns { data, error } and never throws to callers.
 * Connects to the Next.js API running on port 3001.
 */
import type { ApiResponse } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function fail<T>(message: string, code?: string): ApiResponse<T> {
  return { data: null, error: { message, code } };
}

export function delay<T>(value: T, ms = 0): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("hrms.token") : null;
    
    // Set headers
    const headers = new Headers(options.headers || {});
    if (token) {
      // Remove double quotes if present in localStorage
      const cleanToken = token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
      headers.set("Authorization", `Bearer ${cleanToken}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("hrms.token");
        window.localStorage.removeItem("hrms.user");
        window.localStorage.removeItem("hrms.tenant");
        window.location.href = "/login";
      }
      return fail("Session expired. Please log in again.", "UNAUTHORIZED");
    }

    const payload = await res.json();
    return payload as ApiResponse<T>;
  } catch (err: any) {
    console.error(`Request to ${path} failed:`, err);
    return fail("Network connection failed. Please ensure the backend is running.");
  }
}