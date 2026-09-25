import { isToolId, type Answers, type ToolId } from "./types";

export function parseToolAnswers(value: unknown): { tool: ToolId; answers: Answers } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.toolType !== "string" || !isToolId(record.toolType)) return null;
  if (!record.answers || typeof record.answers !== "object" || Array.isArray(record.answers)) return null;
  const entries = Object.entries(record.answers as Record<string, unknown>);
  if (entries.length > 80) return null;
  const answers: Answers = {};
  for (const [key, item] of entries) {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(key)) return null;
    if (typeof item !== "string" || item.length > 20_000) return null;
    answers[key] = item;
  }
  return { tool: record.toolType, answers };
}
