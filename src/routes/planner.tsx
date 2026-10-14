import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Plus, Trash2, Wand2, CalendarDays, Columns3, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { AppShell, Panel, FieldLabel, inputClass } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDraft } from "@/lib/workspace-store";
import { extractTasks } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, PRIORITY_RANK, tasksQuery, today, type Task, type Status } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Atelier" },
      { name: "description", content: "Extract action items and deadlines with AI and organize them by status, priority and calendar." },
      { property: "og:title", content: "Planner — Atelier" },
      { property: "og:description", content: "AI-organized tasks by status, priority and deadline." },
    ],
  }),
  component: PlannerPage,
});

const prioClass: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/20 text-foreground",
  low: "bg-success/15 text-success",
};

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function PlannerPage() {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery(tasksQuery);
  const [bulk, setBulk] = useDraft("plan.bulk");
  const [newTitle, setNewTitle] = useDraft("plan.newTitle");
  const [newDue, setNewDue] = useDraft("plan.newDue");
  const [newPrio, setNewPrio] = useDraft("plan.newPrio", "medium");
  const [view, setView] = useDraft("plan.view", "board");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, status }) => qc.setQueryData<Task[]>(["tasks"], (old) => old?.map((t) => (t.id === id ? { ...t, status } : t))),
    onError: (e) => toast.error((e as Error).message),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => qc.setQueryData<Task[]>(["tasks"], (old) => old?.filter((t) => t.id !== id)),
    onError: (e) => toast.error((e as Error).message),
    onSettled: refresh,
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { error } = await supabase.from("tasks").insert({ title: newTitle.trim(), due_date: newDue || null, priority: newPrio, source: "manual" });
    if (error) { toast.error(error.message); return; }
    setNewTitle("");
    setNewDue("");
    refresh();
  };

  const extract = async () => {
    if (!bulk.trim()) { toast.error("Paste emails or notes to extract tasks from."); return; }
    setBusy(true);
    try {
      const r = await extractTasks({ data: { text: bulk, today: today() } });
      toast.success(r.count ? `${r.count} tasks added` : "No actionable tasks found");
      if (r.count) setBulk("");
      refresh();
      qc.invalidateQueries({ queryKey: ["generations"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const esc = (s: string | null) => `"${(s ?? "").replace(/"/g, '""')}"`;
    const csv = ["Title,Status,Priority,Due date,Owner", ...tasks.map((t) => [esc(t.title), t.status, t.priority, t.due_date ?? "", esc(t.owner)].join(","))].join("\n");
    download("atelier-tasks.csv", csv, "text/csv");
  };
  const exportIcs = () => {
    const ev = tasks.filter((t) => t.due_date).map((t) => {
      const d = t.due_date!.replace(/-/g, "");
      return `BEGIN:VEVENT\r\nUID:${t.id}@atelier\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z\r\nDTSTART;VALUE=DATE:${d}\r\nSUMMARY:${t.title.replace(/[,;]/g, " ")}\r\nDESCRIPTION:Priority ${t.priority} - ${t.status}\r\nEND:VEVENT`;
    });
    download("atelier-tasks.ics", `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Atelier//EN\r\n${ev.join("\r\n")}\r\nEND:VCALENDAR`, "text/calendar");
  };

  const byPriority = useMemo(
    () => [...tasks].filter((t) => t.status !== "completed").sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || (a.due_date ?? "9").localeCompare(b.due_date ?? "9")),
    [tasks],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, Task[]>();
    [...tasks].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")).forEach((t) => {
      const k = t.due_date ?? "No deadline";
      m.set(k, [...(m.get(k) ?? []), t]);
    });
    return [...m.entries()];
  }, [tasks]);

  const Card = ({ t }: { t: Task }) => (
    <div className="neu space-y-3 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-sm font-medium", t.status === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
        <button aria-label="Delete task" onClick={() => remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("rounded-full px-2 py-0.5 font-semibold uppercase", prioClass[t.priority])}>{t.priority}</span>
        {t.due_date && <span className={cn("text-muted-foreground", t.due_date < today() && t.status !== "completed" && "font-semibold text-destructive")}>Due {t.due_date}</span>}
        <select
          value={t.status}
          onChange={(e) => update.mutate({ id: t.id, status: e.target.value as Status })}
          className="neu-inset ml-auto rounded-lg px-2 py-1 text-xs focus:outline-none"
          aria-label="Change status"
        >
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <AppShell title="Planner" subtitle="AI-extracted tasks, organized by status, priority and deadline.">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Panel className="space-y-4">
            <FieldLabel>Bulk text · emails or notes</FieldLabel>
            <textarea className={inputClass + " min-h-[180px]"} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Paste emails, notes, or a messy to-do dump…" />
            <Button variant="hero" className="h-11 w-full" onClick={extract} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? "Extracting…" : "Extract action items"}
            </Button>
          </Panel>
          <Panel>
            <form onSubmit={add} className="space-y-3">
              <FieldLabel>Add a task manually</FieldLabel>
              <input className={inputClass} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" />
              <div className="flex gap-2">
                <input type="date" className={inputClass} value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                <select className={inputClass} value={newPrio} onChange={(e) => setNewPrio(e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <Button variant="neu" className="h-10 w-full" type="submit"><Plus /> Add task</Button>
            </form>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="neu-inset flex rounded-xl p-1">
              {[
                { k: "board", l: "Board", i: Columns3 },
                { k: "priority", l: "Priority", i: ListOrdered },
                { k: "calendar", l: "Calendar", i: CalendarDays },
              ].map((v) => (
                <button key={v.k} onClick={() => setView(v.k)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm", view === v.k ? "neu text-primary" : "text-muted-foreground")}>
                  <v.i className="h-4 w-4" /> {v.l}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="hero" disabled={!tasks.length}><Download /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCsv}>Spreadsheet (.csv)</DropdownMenuItem>
                <DropdownMenuItem onClick={exportIcs}>Calendar (.ics)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks…</p>
          ) : view === "board" ? (
            <div className="grid gap-4 md:grid-cols-3">
              {STATUSES.map((s) => {
                const list = tasks.filter((t) => t.status === s.key);
                return (
                  <Panel key={s.key} className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{s.label}</h3>
                      <span className="neu-inset rounded-full px-2.5 py-0.5 text-xs">{list.length}</span>
                    </div>
                    {list.length ? list.map((t) => <Card key={t.id} t={t} />) : <p className="py-6 text-center text-xs text-muted-foreground">Nothing here</p>}
                  </Panel>
                );
              })}
            </div>
          ) : view === "priority" ? (
            <Panel className="space-y-3">
              {byPriority.length ? byPriority.map((t) => <Card key={t.id} t={t} />) : <p className="text-sm text-muted-foreground">No open tasks.</p>}
            </Panel>
          ) : (
            <div className="space-y-4">
              {byDate.map(([date, list]) => (
                <Panel key={date} className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-primary" />{date === "No deadline" ? date : new Date(date + "T00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</h3>
                  <div className="grid gap-3 md:grid-cols-2">{list.map((t) => <Card key={t.id} t={t} />)}</div>
                </Panel>
              ))}
              {!byDate.length && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
