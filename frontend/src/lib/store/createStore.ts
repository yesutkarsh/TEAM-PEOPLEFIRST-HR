/**
 * Minimal reactive store built on useSyncExternalStore. No external deps.
 * Usage:
 *   const myStore = createStore({ count: 0 });
 *   const count = myStore.useSelector(s => s.count);
 *   myStore.set({ count: 1 });
 */
import { useSyncExternalStore } from "react";

export interface Store<T> {
  get: () => T;
  set: (patch: Partial<T> | ((prev: T) => Partial<T>)) => void;
  reset: () => void;
  subscribe: (listener: () => void) => () => void;
  useSelector: <U>(selector: (state: T) => U) => U;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state: T = initial;
  const listeners = new Set<() => void>();
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  const get = () => state;
  const set: Store<T>["set"] = (patch) => {
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  };
  const reset = () => {
    state = initial;
    listeners.forEach((l) => l());
  };
  const useSelector = <U,>(selector: (s: T) => U): U =>
    useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
  return { get, set, reset, subscribe, useSelector };
}