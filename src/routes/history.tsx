import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { OutputEditor } from "@/components/OutputEditor";
import { Button } from "@/components/ui/button";
import { generationsQuery } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Atelier" },
      { name: "description", content: "Browse, edit and reuse your saved emails, summaries and extracted tasks." },
      { property: "og:title", content: "History — Atelier" },
      { property: "og:description", content: "Your saved AI generations, securely stored." },
    ],
  }),
  component: HistoryPage,
});

const KIND: Record<string, string> = { email: "Email", summary: "Summary", tasks: "Tasks" };

function HistoryPage() {
  const { data = [], isLoading } = useQuery(generationsQuery);
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [edit, setEdit] = useState("");
  const list = data.filter((g) => filter === "all" || g.kind === filter);
  const sel = data.find((g) => g.id === selId);

  const open = (id: string, out: string) => {
    setSelId(id);
    setEdit(out);
  };
  const save = async () => {
    if (!sel) return;
    const { error } = await supabase.from("generations").update({ output: edit }).eq("id", sel.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["generations"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("generations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (id === selId) setSelId(null);
    qc.invalidateQueries({ queryKey: ["generations"] });
  };

  return (
    <AppShell title="History" subtitle="Everything you've generated, saved to your account.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel className="space-y-3 p-4">
          <div className="neu-inset flex rounded-xl p-1 text-sm">
            {["all", "email", "summary", "tasks"].map((k) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("flex-1 rounded-lg py-1.5 capitalize", filter === k ? "neu text-primary" : "text-muted-foreground")}>{k}</button>
            ))}
          </div>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !list.length && <p className="py-8 text-center text-sm text-muted-foreground">No history yet.</p>}
          <div className="max-h-[65vh] space-y-2 overflow-y-auto p-1">
            {list.map((g) => (
              <div key={g.id} className={cn("flex items-start gap-2 rounded-xl p-3", g.id === selId ? "neu" : "hover:bg-card")}>
                <button className="min-w-0 flex-1 text-left" onClick={() => open(g.id, g.output)}>
                  <div className="text-xs font-semibold uppercase text-primary">{KIND[g.kind] ?? g.kind}{g.tone ? ` · ${g.tone}` : ""}</div>
                  <div className="truncate text-sm">{g.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</div>
                </button>
                <button aria-label="Delete" onClick={() => del(g.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          {sel ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{sel.title || "Untitled"}</h3>
                <Button variant="hero" size="sm" onClick={save}><Save /> Save edits</Button>
              </div>
              <OutputEditor value={edit} onChange={setEdit} rows={20} />
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">Select an item to view and edit it.</p>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
