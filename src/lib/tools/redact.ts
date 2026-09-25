import { createHash } from "node:crypto";

import type { ToolId } from "./types";

/** Drop pasted notice text before it is stored. Keep a hash and length so a later report stays traceable. */
export function redactAnswers(tool: ToolId, answers: Record<string, string>): Record<string, string> {
  if (tool !== "notice-auditor") return { ...answers };
  const notice = answers.notice ?? "";
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (key === "notice") continue;
    next[key] = value;
  }
  next.noticeSha256 = createHash("sha256").update(notice).digest("hex");
  next.noticeCharacters = String(notice.length);
  return next;
}
