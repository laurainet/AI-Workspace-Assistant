import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SAFETY = `You are Atelier, a professional workspace assistant. Be accurate and never invent facts, names, dates or commitments that are not present in the user's context. If information is missing, use clear [placeholders].`;

/* ---------- Email ---------- */
const emailInput = z.object({
  mode: z.enum(["compose", "refine", "quick_reply"]),
  context: z.string().max(20000),
  prompt: z.string().max(4000),
  tone: z.string().max(40),
});

export const generateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data, context }) => {
    const { runText } = await import("./ai.server");
    const task = {
      compose: "Write a complete, ready-to-send email including a 'Subject:' line, greeting, body and sign-off.",
      refine: "Rewrite the draft email provided in CONTEXT in the requested tone. Keep the meaning, fix grammar, tighten wording. Keep a 'Subject:' line.",
      quick_reply: "Write a short reply (2-5 sentences) to the message in CONTEXT. Include a greeting and sign-off. No subject line.",
    }[data.mode];
    const instructions = `${SAFETY}

## ROLE
Expert business communication writer.
## TASK
${task}
## TONE
${data.tone}. Match vocabulary, formality and warmth to this tone.
## OUTPUT FORMAT
Plain text email only. No commentary, no markdown headings.`;
    const prompt = `### CONTEXT (raw notes / thread)\n${data.context || "(none)"}\n\n### REQUEST\n${data.prompt || "(none)"}`;
    const output = await runText(instructions, prompt);
    const title = (data.prompt || data.context).slice(0, 70) || "Email";
    const { data: row, error } = await context.supabase
      .from("generations")
      .insert({ kind: "email", title, input: prompt, tone: data.tone, output })
      .select("id")
      .single();
    if (error) console.error("save generation", error);
    return { output, id: row?.id ?? null };
  });

/* ---------- Meeting summary ---------- */
const summarySchema = z.object({
  executive_summary: z.string(),
  key_decisions: z.array(z.string()),
  updates: z.array(z.string()),
  action_items: z.array(
    z.object({
      title: z.string(),
      owner: z.string().nullable(),
      due_date: z.string().nullable().describe("ISO date YYYY-MM-DD or null"),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
});
export type MeetingSummary = z.infer<typeof summarySchema>;

export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ notes: z.string().min(1).max(60000), today: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runObject } = await import("./ai.server");
    const instructions = `${SAFETY}

## ROLE
Chief of staff who turns raw meeting notes into briefings for executives.
## TASK
1. executive_summary: 3-5 sentences, the essentials.
2. key_decisions: decisions actually made.
3. updates: status updates / FYIs.
4. action_items: concrete tasks with owner (if stated), due_date resolved to YYYY-MM-DD relative to TODAY (null if none), and priority.
## RULES
Use only information in the notes. Empty arrays are fine.`;
    const result = await runObject(instructions, `TODAY: ${data.today}\n\n### MEETING NOTES\n${data.notes}`, summarySchema);
    const output = formatSummary(result);
    const { error } = await context.supabase.from("generations").insert({
      kind: "summary",
      title: result.executive_summary.slice(0, 70),
      input: data.notes,
      output,
    });
    if (error) console.error("save summary", error);
    return { summary: result, output };
  });

export function formatSummary(s: MeetingSummary) {
  const list = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join("\n") : "- None");
  return `## Executive Summary\n${s.executive_summary}\n\n## Key Decisions\n${list(s.key_decisions)}\n\n## Updates\n${list(s.updates)}\n\n## Action Items\n${list(
    s.action_items.map((a) => `${a.title}${a.owner ? ` — ${a.owner}` : ""}${a.due_date ? ` (due ${a.due_date})` : ""} [${a.priority}]`),
  )}`;
}

/* ---------- Task extraction ---------- */
const tasksSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      owner: z.string().nullable(),
      due_date: z.string().nullable().describe("ISO date YYYY-MM-DD or null"),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ),
});

export const extractTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().min(1).max(60000), today: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runObject } = await import("./ai.server");
    const instructions = `${SAFETY}

## ROLE
Project planner.
## TASK
Extract every actionable task from the text (emails, notes, bulk lists). For each: short imperative title, owner if named, due_date resolved to YYYY-MM-DD relative to TODAY (null if none), priority (high = urgent/blocking/near deadline, low = nice-to-have).
## RULES
Do not invent tasks. Merge duplicates.`;
    const { tasks } = await runObject(instructions, `TODAY: ${data.today}\n\n### TEXT\n${data.text}`, tasksSchema);
    if (!tasks.length) return { count: 0 };
    const rows = tasks.map((t) => ({
      title: t.title,
      owner: t.owner,
      due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
      priority: t.priority,
      source: "ai",
    }));
    const { error } = await context.supabase.from("tasks").insert(rows);
    if (error) throw new Error("Could not save tasks: " + error.message);
    await context.supabase.from("generations").insert({
      kind: "tasks",
      title: `${rows.length} tasks extracted`,
      input: data.text,
      output: rows.map((r) => `- ${r.title}${r.due_date ? ` (due ${r.due_date})` : ""} [${r.priority}]`).join("\n"),
    });
    return { count: rows.length };
  });
