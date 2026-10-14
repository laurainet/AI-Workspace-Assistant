import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun, Check, RotateCcw } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { useAppearance, updateAppearance, DEFAULTS, type Accent, type Appearance } from "@/lib/appearance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Atelier" },
      { name: "description", content: "Customise Atelier's theme, colours and accessibility options." },
      { property: "og:title", content: "Settings — Atelier" },
      { property: "og:description", content: "Theme, colour and readability settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const ACCENTS: { key: Accent; label: string; swatch: string }[] = [
  { key: "pink", label: "Pastel pink", swatch: "oklch(0.8 0.1 355)" },
  { key: "blue", label: "Pastel blue", swatch: "oklch(0.8 0.08 235)" },
  { key: "green", label: "Pastel green", swatch: "oklch(0.8 0.09 155)" },
  { key: "yellow", label: "Pastel yellow", swatch: "oklch(0.88 0.11 95)" },
  { key: "purple", label: "Pastel purple", swatch: "oklch(0.78 0.09 300)" },
];

const TOGGLES: { key: keyof Appearance; label: string; desc: string }[] = [
  { key: "contrast", label: "High contrast", desc: "Darker text and stronger borders" },
  { key: "readableFont", label: "Readable font", desc: "Switch to Atkinson Hyperlegible, designed for low vision" },
  { key: "wideSpacing", label: "Wider spacing", desc: "More space between lines and letters" },
  { key: "underlineLinks", label: "Underline links", desc: "Make links easier to spot" },
  { key: "reduceMotion", label: "Reduce motion", desc: "Turn off animations and movement" },
];

function SettingsPage() {
  const a = useAppearance();
  return (
    <AppShell title="Settings" subtitle="Make Atelier look and read the way that suits you. Saved on this device.">
      <div className="grid max-w-3xl gap-6">
        <Panel>
          <h3 className="mb-4 font-semibold">Display mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: false, label: "Light", Icon: Sun }, { v: true, label: "Dark", Icon: Moon }].map(({ v, label, Icon }) => (
              <button key={label} onClick={() => updateAppearance({ dark: v })} className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium", a.dark === v ? "neu-inset text-primary" : "neu")}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-4 font-semibold">Main colour</h3>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((c) => (
              <button key={c.key} onClick={() => updateAppearance({ accent: c.key })} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm", a.accent === c.key ? "neu-inset font-semibold" : "neu")}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: c.swatch }}>
                  {a.accent === c.key && <Check className="h-3.5 w-3.5 text-foreground" />}
                </span>
                {c.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-1 font-semibold">Text size</h3>
          <p className="mb-4 text-sm text-muted-foreground">{a.size}%</p>
          <input type="range" min={85} max={140} step={5} value={a.size} onChange={(e) => updateAppearance({ size: Number(e.target.value) })} className="w-full accent-[var(--primary)]" aria-label="Text size" />
        </Panel>

        <Panel>
          <h3 className="mb-4 font-semibold">Accessibility & readability</h3>
          <div className="space-y-2">
            {TOGGLES.map((t) => {
              const on = Boolean(a[t.key]);
              return (
                <button key={t.key} role="switch" aria-checked={on} onClick={() => updateAppearance({ [t.key]: !on } as Partial<Appearance>)} className="neu-inset flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left">
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.desc}</span>
                  </span>
                  <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <button onClick={() => updateAppearance(DEFAULTS)} className="neu flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </button>
      </div>
    </AppShell>
  );
}
