import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { binQuery } from "@/lib/tasks";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bin")({
  head: () => ({
    meta: [
      { title: "Bin — Atelier" },
      { name: "description", content: "Restore or permanently delete recently deleted tasks and generations." },
      { property: "og:title", content: "Bin — Atelier" },
      { property: "og:description", content: "Recently deleted items, kept for 30 days." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BinPage,
});

function daysLeft(d: string) {
  return Math.max(0, 30 - Math.floor((Date.now() - new Date(d).getTime()) / 864e5));
}

function BinPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery(binQuery);
  const refresh = () => ["bin", "tasks", "generations"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const restore = async (table: "tasks" | "generations", id: string) => {
    const { error } = await supabase.from(table).update({ deleted_at: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Restored");
    refresh();
  };
  const purge = async (table: "tasks" | "generations", id: string) => {
    if (!confirm("Delete this permanently? This can't be undone.")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Permanently deleted");
    refresh();
  };

  return (
    <AppShell title="Bin" subtitle="Recently deleted tasks and generations.">
      <div className="space-y-4">
        <div className="glass flex items-start gap-3 rounded-2xl px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Recently deleted items will be permanently deleted after 30 days.</span>
        </div>
        <Panel>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length ? (
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="neu-inset flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
                  <span className="text-xs font-semibold uppercase text-primary">{i.kind}</span>
                  <span className="min-w-0 flex-1 truncate">{i.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{daysLeft(i.deleted_at)} days left</span>
                  <button onClick={() => restore(i.table, i.id)} aria-label="Restore" title="Restore" className="text-muted-foreground hover:text-primary"><RotateCcw className="h-4 w-4" /></button>
                  <button onClick={() => purge(i.table, i.id)} aria-label="Delete permanently" title="Delete permanently" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">The bin is empty.</p>}
        </Panel>
      </div>
    </AppShell>
  );
}
