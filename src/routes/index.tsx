import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, NotebookPen, KanbanSquare, ArrowRight, AlertTriangle } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { tasksQuery, generationsQuery, STATUSES, PRIORITY_RANK, today } from "@/lib/tasks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — AI Workspace Assistant" },
      { name: "description", content: "AI assistant for professionals: write emails, summarize meetings and plan tasks automatically." },
      { property: "og:title", content: "Atelier — AI Workspace Assistant" },
      { property: "og:description", content: "Write emails, summarize meetings and plan tasks with AI." },
    ],
  }),
  component: Overview,
});

const TOOLS = [
  { to: "/email", title: "Email Studio", desc: "Compose, refine tone, quick replies", icon: Mail },
  { to: "/meetings", title: "Meeting Notes", desc: "Executive summaries & decisions", icon: NotebookPen },
  { to: "/planner", title: "Planner", desc: "Extract deadlines & action items", icon: KanbanSquare },
] as const;

function Overview() {
  const { data: tasks = [] } = useQuery(tasksQuery);
  const { data: gens = [] } = useQuery(generationsQuery);
  const upcoming = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))
    .slice(0, 6);
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today() && t.status !== "completed").length;

  return (
    <AppShell title="Good to see you" subtitle="Your AI workspace — everything you draft and plan is saved automatically.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => (
            <Panel key={s.key} className="p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="font-display mt-2 text-4xl font-semibold">{tasks.filter((t) => t.status === s.key).length}</div>
            </Panel>
          ))}
          <Panel className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved generations</div>
            <div className="font-display mt-2 text-4xl font-semibold">{gens.length}</div>
          </Panel>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className="glass group rounded-3xl p-6 transition-transform hover:-translate-y-1">
              <div className="neu mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-primary"><t.icon className="h-5 w-5" /></div>
              <h3 className="text-lg font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Top priorities</h3>
              {overdue > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> {overdue} overdue</span>}
            </div>
            <div className="space-y-2">
              {upcoming.length ? upcoming.map((t) => (
                <div key={t.id} className="neu-inset flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-xs uppercase text-muted-foreground">{t.priority}{t.due_date ? ` · ${t.due_date}` : ""}</span>
                </div>
              )) : <p className="text-sm text-muted-foreground">No open tasks — extract some in the Planner.</p>}
            </div>
          </Panel>
          <Panel>
            <h3 className="mb-4 font-semibold">Recent activity</h3>
            <div className="space-y-2">
              {gens.slice(0, 6).map((g) => (
                <div key={g.id} className="neu-inset rounded-xl px-4 py-3 text-sm">
                  <span className="mr-2 text-xs font-semibold uppercase text-primary">{g.kind}</span>
                  <span>{g.title || "Untitled"}</span>
                </div>
              ))}
              {!gens.length && <p className="text-sm text-muted-foreground">Nothing generated yet.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
