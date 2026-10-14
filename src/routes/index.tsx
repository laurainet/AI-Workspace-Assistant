import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, NotebookPen, KanbanSquare, ArrowRight, AlertTriangle, Sparkles, Send } from "lucide-react";
import { AppShell, Panel } from "@/components/AppShell";
import { tasksQuery, generationsQuery, STATUSES, PRIORITY_RANK, today } from "@/lib/tasks";
import { useAuth } from "@/hooks/use-auth";
import { setDraft } from "@/lib/workspace-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atelier — AI Workspace Assistant" },
      { name: "description", content: "AI assistant for professionals: write emails, summarize meetings and plan tasks automatically." },
      { property: "og:title", content: "Atelier — AI Workspace Assistant" },
      { property: "og:description", content: "Write emails, summarize meetings and plan tasks with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ask, setAsk] = useState("");
  const { data: tasks = [] } = useQuery(tasksQuery);
  const { data: gens = [] } = useQuery(generationsQuery);
  const upcoming = tasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1) || (a.due_date ?? "9").localeCompare(b.due_date ?? "9"))
    .slice(0, 6);
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today() && t.status !== "completed").length;
  const meta = (user?.user_metadata ?? {}) as Record<string, string>;
  const name = meta["full_name"] || meta["name"] || user?.email?.split("@")[0] || "there";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = ask.trim();
    if (!q) return;
    const l = q.toLowerCase();
    if (/meeting|minutes|summar|notes|transcript/.test(l)) {
      setDraft("meet.notes", q);
      navigate({ to: "/meetings" });
    } else if (/task|plan|deadline|todo|to-do|schedule|calendar|action item/.test(l)) {
      setDraft("plan.bulk", q);
      navigate({ to: "/planner" });
    } else {
      setDraft("email.mode", "compose");
      setDraft("email.prompt", q);
      navigate({ to: "/email" });
    }
  };

  const statCards = [
    ...STATUSES.map((s) => ({ key: s.key, label: s.label, count: tasks.filter((t) => t.status === s.key).length, to: "/planner" as const })),
    { key: "gens", label: "Saved generations", count: gens.length, to: "/history" as const },
  ];

  return (
    <AppShell title="" subtitle="">
      <div className="space-y-6">
        <div className="pt-2 text-center">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Welcome, <span className="text-primary">{name}</span></h1>
          <p className="mt-2 text-sm text-muted-foreground">Everything you draft and plan is saved automatically.</p>
          <form onSubmit={submit} className="glass mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-full p-2 pl-5">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="What can I do for you today?"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm placeholder:text-muted-foreground/80 focus:outline-none"
            />
            <button type="submit" className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-full text-primary-foreground" aria-label="Generate">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {TOOLS.map((t) => (
            <Link key={t.to} to={t.to} className="glass group flex items-center gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
              <div className="neu flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-primary"><t.icon className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="truncate text-xs text-muted-foreground">{t.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => (
            <Link key={s.key} to={s.to} className="glass flex items-center justify-between rounded-2xl px-4 py-3 transition-transform hover:-translate-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <span className="font-display text-xl font-semibold text-primary">{s.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
