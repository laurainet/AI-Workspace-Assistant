import { useEffect, useSyncExternalStore } from "react";

export type Accent = "pink" | "blue" | "green" | "yellow" | "purple";
export type Appearance = {
  dark: boolean;
  accent: Accent;
  size: number;
  contrast: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
  wideSpacing: boolean;
  underlineLinks: boolean;
};
const KEY = "atelier-appearance";
export const DEFAULTS: Appearance = { dark: false, accent: "pink", size: 100, contrast: false, reduceMotion: false, readableFont: false, wideSpacing: false, underlineLinks: false };
let state: Appearance = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { state = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { /* ignore */ }
}

export function updateAppearance(patch: Partial<Appearance>) {
  load();
  state = { ...state, ...patch };
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useAppearance() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => { load(); return state; },
    () => DEFAULTS,
  );
}

export function AppearanceSync() {
  const a = useAppearance();
  useEffect(() => {
    const h = document.documentElement;
    h.classList.toggle("dark", a.dark);
    h.classList.toggle("hc", a.contrast);
    h.classList.toggle("reduce-motion", a.reduceMotion);
    h.classList.toggle("readable-font", a.readableFont);
    h.classList.toggle("wide-spacing", a.wideSpacing);
    h.classList.toggle("underline-links", a.underlineLinks);
    if (a.accent === "pink") h.removeAttribute("data-accent"); else h.setAttribute("data-accent", a.accent);
    h.style.fontSize = `${a.size}%`;
  }, [a]);
  return null;
}
