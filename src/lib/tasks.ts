import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Status = "todo" | "in_progress" | "completed";
export const STATUSES: { key: Status; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];
export const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tasks").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (error) throw error;
    return data as Task[];
  },
});

export const generationsQuery = queryOptions({
  queryKey: ["generations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("generations").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  },
});

export const binQuery = queryOptions({
  queryKey: ["bin"],
  queryFn: async () => {
    const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
    await supabase.from("tasks").delete().lt("deleted_at", cutoff);
    await supabase.from("generations").delete().lt("deleted_at", cutoff);
    const [t, g] = await Promise.all([
      supabase.from("tasks").select("id,title,deleted_at").not("deleted_at", "is", null),
      supabase.from("generations").select("id,title,kind,deleted_at").not("deleted_at", "is", null),
    ]);
    if (t.error) throw t.error;
    if (g.error) throw g.error;
    return [
      ...t.data.map((x) => ({ id: x.id, title: x.title, kind: "task", table: "tasks" as const, deleted_at: x.deleted_at as string })),
      ...g.data.map((x) => ({ id: x.id, title: x.title || "Untitled", kind: x.kind, table: "generations" as const, deleted_at: x.deleted_at as string })),
    ].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  },
});

export const today = () => new Date().toISOString().slice(0, 10);
