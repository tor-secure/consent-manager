import { createHash } from "node:crypto";
import { z } from "zod";

import { BedrockProvider } from "./bedrock-provider";
import { minimizeAiContext } from "./sanitize";
import type { AiProvider, AiResult } from "./types";

export const advisoryEnrichmentSchema = z.object({
  summary: z.string().min(1).max(1_500),
  priorities: z.array(z.string().min(1).max(300)).max(8),
  operatorDraft: z.string().max(2_000).optional(),
  caveats: z.array(z.string().min(1).max(300)).max(8),
});

export type AdvisoryEnrichment = z.infer<typeof advisoryEnrichmentSchema>;

let providerFactory: () => AiProvider = () => new BedrockProvider();

export function setAiProviderFactoryForTests(factory: () => AiProvider): () => void {
  const previous = providerFactory;
  providerFactory = factory;
  return () => {
    providerFactory = previous;
  };
}

export function fingerprintIntelligenceInput(input: unknown): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function enrichDeterministicOutput(input: {
  engine: string;
  aggregateContext: Record<string, unknown>;
  deterministicOutput: unknown;
  provider?: AiProvider;
  signal?: AbortSignal;
}): Promise<AiResult<AdvisoryEnrichment>> {
  const context = minimizeAiContext(input.aggregateContext);
  const fallback = (): AdvisoryEnrichment => ({
    summary: "Deterministic analysis completed. AI enrichment is unavailable.",
    priorities: [],
    caveats: ["The deterministic result remains authoritative."],
  });

  return (input.provider ?? providerFactory()).generate({
    system:
      "You are an advisory privacy-operations assistant. Explain and prioritize only. Never make legal determinations, change enforcement, claim certainty, or request identifiers/personal data. Return JSON only.",
    prompt: JSON.stringify({
      engine: input.engine,
      aggregateContext: context,
      deterministicOutput: input.deterministicOutput,
      outputShape: {
        summary: "string",
        priorities: ["string"],
        operatorDraft: "optional string",
        caveats: ["string"],
      },
    }),
    schema: advisoryEnrichmentSchema,
    fallback,
    signal: input.signal,
  });
}
