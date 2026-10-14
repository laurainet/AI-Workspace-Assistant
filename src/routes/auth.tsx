import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Feather } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Atelier AI Workspace" },
      { name: "description", content: "Sign in to Atelier, your AI assistant for emails, meeting summaries and task planning." },
      { property: "og:title", content: "Sign in — Atelier AI Workspace" },
      { property: "og:description", content: "Your AI assistant for emails, meeting summaries and planning." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up" && !data.session) toast.success("Check your inbox to confirm your email.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String(r.error.message ?? r.error));
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass w-full max-w-md rounded-3xl p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="bg-gradient-primary flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground">
            <Feather className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Atelier</h1>
            <p className="text-sm text-muted-foreground">Your AI workspace assistant</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input className={inputClass} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputClass} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="hero" className="h-11 w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <Button variant="neu" className="mt-3 h-11 w-full" onClick={google}>
          Continue with Google
        </Button>
        <button className="mt-6 w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
