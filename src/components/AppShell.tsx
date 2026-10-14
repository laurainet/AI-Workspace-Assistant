import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Mail, NotebookPen, KanbanSquare, History, LogOut, Menu, X, ShieldAlert, Feather, PanelLeftClose, PanelLeftOpen, Trash2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/email", label: "Email Studio", icon: Mail },
  { to: "/meetings", label: "Meeting Notes", icon: NotebookPen },
  { to: "/planner", label: "Planner", icon: KanbanSquare },
  { to: "/history", label: "History", icon: History },
  { to: "/bin", label: "Bin", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("atelier-collapsed") === "1"); }, []);
  const toggle = () => { const v = !collapsed; setCollapsed(v); localStorage.setItem("atelier-collapsed", v ? "1" : "0"); };

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading workspace…</div>;
  }

  const renderSidebar = (mini: boolean) => (
    <nav className={cn("flex h-full flex-col gap-2", mini ? "items-center p-3" : "p-5")}>
      <div className={cn("mb-6 flex items-center gap-3", mini ? "" : "px-2")}>
        <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-neu-sm)]">
          <Feather className="h-5 w-5" />
        </div>
        {!mini && <div>
          <div className="font-display text-lg font-semibold">Atelier</div>
          <div className="text-xs text-muted-foreground">AI workspace</div>
        </div>}
      </div>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          onClick={() => setOpen(false)}
          title={n.label}
          activeOptions={{ exact: n.to === "/" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground"
          activeProps={{ className: "neu !text-primary" }}
        >
          <n.icon className="h-4 w-4 shrink-0" />
          {!mini && n.label}
        </Link>
      ))}
      <div className="mt-auto space-y-3">
        <button onClick={toggle} title={mini ? "Expand sidebar" : "Collapse sidebar"} className="hidden w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:flex">
          {mini ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
        </button>
        {!mini && <><div className="neu-inset rounded-xl p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-accent" /> Use AI responsibly
          </div>
          AI can make mistakes. Review and edit every output before sending or acting on it.
        </div>
        <div className="truncate px-2 text-xs text-muted-foreground">{user.email}</div></>}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> {!mini && "Sign out"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cn("glass sticky top-4 m-4 hidden h-[calc(100vh-2rem)] shrink-0 rounded-3xl transition-all md:block", collapsed ? "w-20" : "w-64")}>{renderSidebar(collapsed)}</aside>
      {open && (
        <div className="fixed inset-0 z-40 bg-foreground/20 md:hidden" onClick={() => setOpen(false)}>
          <aside className="glass h-full w-72 rounded-r-3xl" onClick={(e) => e.stopPropagation()}>
            {renderSidebar(false)}
          </aside>
        </div>
      )}
      <main className="min-w-0 flex-1 p-4 md:p-8 md:pl-4">
        <header className="mb-6 flex items-start gap-3">
          <button className="neu rounded-xl p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {title && <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>}
        </header>
        {children}
      </main>
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("glass rounded-3xl p-5 md:p-6", className)}>{children}</section>;
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</label>;
}

export const inputClass =
  "neu-inset w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40";
