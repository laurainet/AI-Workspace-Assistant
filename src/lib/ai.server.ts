import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import type { z } from "zod";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const MODEL = "openai/gpt-6-astra";

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured (missing key).");
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
}

const providerOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
};

function friendly(err: unknown): Error {
  const e = err as { statusCode?: number; message?: string };
  const s = e?.statusCode;
  if (s === 429) return new Error("Too many requests right now. Please wait a moment and try again.");
  if (s === 402) return new Error("AI credits are used up. Add credits in your workspace billing settings.");
  if (s === 403) return new Error("AI access is blocked for this workspace.");
  return new Error(e?.message || "The AI request failed.");
}

export async function runText(instructions: string, prompt: string): Promise<string> {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      prompt,
      maxRetries: 0,
      providerOptions,
    });
    const text = await result.text;
    if (!text.trim()) throw new Error("The AI returned an empty response.");
    return text;
  } catch (err) {
    throw friendly(err);
  }
}

export async function runObject<T>(instructions: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      prompt,
      maxRetries: 0,
      output: Output.object({ schema }),
      providerOptions,
    });
    return (await result.output) as T;
  } catch (err) {
    throw friendly(err);
  }
}
