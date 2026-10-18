import { z } from "zod";

import type { SubmittedAnswer } from "./engine";

const idSchema = z.string().uuid();

const submittedAnswersSchema = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: idSchema,
          optionIds: z.array(idSchema).max(32),
        }),
      )
      .max(120),
  })
  .strict();

export type ParseAnswersResult =
  | { ok: true; answers: SubmittedAnswer[] }
  | { ok: false; error: "invalid" | "duplicate_question" };

/** Validate quiz/exam answer payloads: shape, UUIDs, and no duplicate question entries. */
export function parseSubmittedAnswers(body: unknown): ParseAnswersResult {
  const parsed = submittedAnswersSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const seen = new Set<string>();
  for (const answer of parsed.data.answers) {
    if (seen.has(answer.questionId)) return { ok: false, error: "duplicate_question" };
    seen.add(answer.questionId);
  }
  return { ok: true, answers: parsed.data.answers };
}

export function isLearningAttemptId(value: string): boolean {
  return idSchema.safeParse(value).success;
}

/** Decode a certificate path segment without throwing on malformed percent-encoding. */
export function safeDecodeCertificateCode(raw: string): string | null {
  try {
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded || decoded.length > 80) return null;
    if (/[\u0000-\u001f\u007f]/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}
