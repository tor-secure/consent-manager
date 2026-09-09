import type { ZodType } from "zod";

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
};

export type AiResult<T> = {
  value: T;
  provider: string;
  model?: string;
  fallback: boolean;
  latencyMs: number;
  usage: AiUsage;
  errorCode?: "disabled" | "timeout" | "provider_error" | "invalid_output";
};

export type AiGenerateRequest<T> = {
  system: string;
  prompt: string;
  schema: ZodType<T>;
  fallback: () => T;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export interface AiProvider {
  readonly name: string;
  generate<T>(request: AiGenerateRequest<T>): Promise<AiResult<T>>;
}
