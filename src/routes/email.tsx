import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel, FieldLabel, inputClass } from "@/components/AppShell";
import { OutputEditor } from "@/components/OutputEditor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDraft } from "@/lib/workspace-store";
import { generateEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Email Studio — Atelier" },
      { name: "description", content: "Generate contextual emails, refine tone and draft quick replies with AI." },
      { property: "og:title", content: "Email Studio — Atelier" },
      { property: "og:description", content: "Contextual emails, tone refinement and quick replies." },
    ],
  }),
  component: EmailPage,
});

const TONES = ["Professional", "Friendly", "Formal", "Concise", "Persuasive", "Empathetic", "Assertive", "Apologetic"];
const MODES = [
  { key: "compose", label: "Compose" },
  { key: "refine", label: "Refine tone" },
  { key: "quick_reply", label: "Quick reply" },
] as const;

function EmailPage() {
  const [mode, setMode] = useDraft("email.mode", "compose");
  const [context, setContext] = useDraft("email.context");
  const [prompt, setPrompt] = useDraft("email.prompt");
  const [tone, setTone] = useDraft("email.tone", "Professional");
  const [output, setOutput] = useDraft("email.output");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const run = async () => {
    if (!context.trim() && !prompt.trim()) { toast.error("Add some context or a prompt first."); return; }
    setBusy(true);
    try {
      const r = await generateEmail({ data: { mode: mode as "compose", context, prompt, tone } });
      setOutput(r.output);
      qc.invalidateQueries({ queryKey: ["generations"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Email Studio" subtitle="Draft, refine and reply — in the tone you need.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-5">
          <div className="neu-inset flex rounded-xl p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${mode === m.key ? "neu text-primary" : "text-muted-foreground"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div>
            <FieldLabel>Context · raw notes, thread, or draft</FieldLabel>
            <textarea className={inputClass + " min-h-[180px]"} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Paste an email thread, bullet notes, or your draft…" />
          </div>
          <div>
            <FieldLabel>Brief prompt</FieldLabel>
            <input className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Decline politely and propose next Tuesday" />
          </div>
          <div>
            <FieldLabel>Tone</FieldLabel>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="neu-inset h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="hero" className="h-11 w-full" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? "Writing…" : "Generate email"}
          </Button>
        </Panel>
        <Panel>
          <FieldLabel>Output</FieldLabel>
          <OutputEditor value={output} onChange={setOutput} rows={20} />
        </Panel>
      </div>
    </AppShell>
  );
}
