import { useSyncExternalStore } from "react";

/** Draft state that survives tab switches (in-memory + sessionStorage). */
type State = Record<string, string>;
const KEY = "atelier-drafts";
let state: State = {};
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    state = {};
  }
}

export function setDraft(key: string, value: string) {
  load();
  state = { ...state, [key]: value };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useDraft(key: string, initial = ""): [string, (v: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state[key] ?? initial;
    },
    () => initial,
  );
  return [value, (v: string) => setDraft(key, v)];
}
