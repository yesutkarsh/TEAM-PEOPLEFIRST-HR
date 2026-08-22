/**
 * Base API client. Returns { data, error } and never throws to callers.
 * In Phase 1 this is a frontend-only mock — requests resolve against
 * browser storage with a small synthetic delay.
 */
import type { ApiResponse } from "../types/api";

const DELAY_MS = 250;

export function ok<T>(data: T): ApiResponse<T> {
  return { data, error: null };
}

export function fail<T>(message: string, code?: string): ApiResponse<T> {
  return { data: null, error: { message, code } };
}

export function delay<T>(value: T, ms = DELAY_MS): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}