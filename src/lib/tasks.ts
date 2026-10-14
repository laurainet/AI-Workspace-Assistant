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
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Task[];
  },
});

export const generationsQuery = queryOptions({
  queryKey: ["generations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("generations").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data;
  },
});

export const today = () => new Date().toISOString().slice(0, 10);
