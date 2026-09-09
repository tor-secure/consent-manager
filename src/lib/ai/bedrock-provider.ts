import {
  BedrockRuntimeClient,
  ConverseCommand,
  type BedrockRuntimeClientConfig,
} from "@aws-sdk/client-bedrock-runtime";

import type { AiGenerateRequest, AiProvider, AiResult } from "./types";

type ConverseClient = Pick<BedrockRuntimeClient, "send">;

export type BedrockProviderOptions = {
  client?: ConverseClient;
  region?: string;
  modelId?: string;
  defaultTimeoutMs?: number;
  inputCostPerMillion?: number;
  outputCostPerMillion?: number;
};

function fallbackResult<T>(
  request: AiGenerateRequest<T>,
  started: number,
  errorCode: AiResult<T>["errorCode"],
  model?: string,
): AiResult<T> {
  return {
    value: request.fallback(),
    provider: "deterministic",
    model,
    fallback: true,
    latencyMs: Date.now() - started,
    usage: {},
    errorCode,
  };
}

export class BedrockProvider implements AiProvider {
  readonly name = "aws-bedrock";
  private readonly client: ConverseClient;
  private readonly modelId: string;
  private readonly timeoutMs: number;
  private readonly inputCost: number;
  private readonly outputCost: number;

  constructor(options: BedrockProviderOptions = {}) {
    const region = options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
    this.modelId = options.modelId ?? process.env.BEDROCK_MODEL_ID ?? "";
    this.timeoutMs = options.defaultTimeoutMs ?? Number(process.env.BEDROCK_TIMEOUT_MS ?? 8_000);
    this.inputCost = options.inputCostPerMillion ?? Number(process.env.BEDROCK_INPUT_COST_PER_MILLION ?? 0);
    this.outputCost = options.outputCostPerMillion ?? Number(process.env.BEDROCK_OUTPUT_COST_PER_MILLION ?? 0);

    const config: BedrockRuntimeClientConfig = {};
    if (region) config.region = region;
    // Credentials deliberately use the AWS SDK's normal credential chain.
    this.client = options.client ?? new BedrockRuntimeClient(config);
  }

  async generate<T>(request: AiGenerateRequest<T>): Promise<AiResult<T>> {
    const started = Date.now();
    if (!this.modelId) return fallbackResult(request, started, "disabled");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? this.timeoutMs);
    const abort = () => controller.abort();
    request.signal?.addEventListener("abort", abort, { once: true });

    try {
      const response = await this.client.send(
        new ConverseCommand({
          modelId: this.modelId,
          system: [{ text: request.system }],
          messages: [{ role: "user", content: [{ text: request.prompt }] }],
          inferenceConfig: { temperature: 0, maxTokens: 1_200 },
        }),
        { abortSignal: controller.signal },
      );
      const text = response.output?.message?.content?.find((part) => "text" in part)?.text;
      if (!text) return fallbackResult(request, started, "invalid_output", this.modelId);

      let decoded: unknown;
      try {
        decoded = JSON.parse(text);
      } catch {
        return fallbackResult(request, started, "invalid_output", this.modelId);
      }
      const validated = request.schema.safeParse(decoded);
      if (!validated.success) return fallbackResult(request, started, "invalid_output", this.modelId);

      const inputTokens = response.usage?.inputTokens;
      const outputTokens = response.usage?.outputTokens;
      const estimatedCostUsd =
        inputTokens !== undefined && outputTokens !== undefined && (this.inputCost || this.outputCost)
          ? (inputTokens * this.inputCost + outputTokens * this.outputCost) / 1_000_000
          : undefined;
      return {
        value: validated.data,
        provider: this.name,
        model: this.modelId,
        fallback: false,
        latencyMs: Date.now() - started,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: response.usage?.totalTokens,
          estimatedCostUsd,
        },
      };
    } catch {
      return fallbackResult(
        request,
        started,
        controller.signal.aborted ? "timeout" : "provider_error",
        this.modelId,
      );
    } finally {
      clearTimeout(timeout);
      request.signal?.removeEventListener("abort", abort);
    }
  }
}
