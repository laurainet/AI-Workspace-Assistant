import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Sparkle, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell, Panel, FieldLabel, inputClass } from "@/components/AppShell";
import { OutputEditor } from "@/components/OutputEditor";
import { Button } from "@/components/ui/button";
import { useDraft } from "@/lib/workspace-store";
import { summarizeMeeting } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { today } from "@/lib/tasks";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Notes — Atelier" },
      { name: "description", content: "Turn raw meeting notes into executive summaries, key decisions, updates and action items." },
      { property: "og:title", content: "Meeting Notes — Atelier" },
      { property: "og:description", content: "Executive summaries, decisions and action items from your notes." },
    ],
  }),
  component: MeetingsPage,
});

type Action = { title: string; owner: string | null; due_date: string | null; priority: "high" | "medium" | "low" };

function MeetingsPage() {
  const [notes, setNotes] = useDraft("meet.notes");
  const [output, setOutput] = useDraft("meet.output");
  const [actionsRaw, setActionsRaw] = useDraft("meet.actions", "[]");
  const actions: Action[] = JSON.parse(actionsRaw || "[]");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const run = async () => {
    if (!notes.trim()) { toast.error("Paste your meeting notes first."); return; }
    setBusy(true);
    try {
      const r = await summarizeMeeting({ data: { notes, today: today() } });
      setOutput(r.output);
      setActionsRaw(JSON.stringify(r.summary.action_items));
      qc.invalidateQueries({ queryKey: ["generations"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addToPlanner = async () => {
    const rows = actions.map((a) => ({
      title: a.owner ? `${a.title} (${a.owner})` : a.title,
      owner: a.owner,
      due_date: a.due_date && /^\d{4}-\d{2}-\d{2}$/.test(a.due_date) ? a.due_date : null,
      priority: a.priority,
      source: "meeting",
    }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} action items added to Planner`);
    setActionsRaw("[]");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  return (
    <AppShell title="Meeting Notes" subtitle="From messy notes to an executive-ready briefing.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-5">
          <div>
            <FieldLabel>Raw meeting notes · bulk input</FieldLabel>
            <textarea className={inputClass + " min-h-[420px]"} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste transcripts or notes — any length, any format…" />
          </div>
          <Button variant="hero" className="h-11 w-full" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkle />} {busy ? "Summarizing…" : "Summarize meeting"}
          </Button>
        </Panel>
        <Panel className="space-y-5">
          <div>
            <FieldLabel>Executive summary · decisions · updates</FieldLabel>
            <OutputEditor value={output} onChange={setOutput} rows={18} />
          </div>
          {actions.length > 0 && (
            <div className="neu-inset space-y-2 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{actions.length} action items found</span>
                <Button variant="hero" size="sm" onClick={addToPlanner}><ListPlus /> Add to Planner</Button>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {actions.map((a, i) => (
                  <li key={i}>• {a.title}{a.due_date ? ` — due ${a.due_date}` : ""} <span className="text-xs uppercase">[{a.priority}]</span></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
