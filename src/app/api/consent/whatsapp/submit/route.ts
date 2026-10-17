import type { ConsentSubmission } from "@/lib/consent-engine";
import { MAX_DECISION_ITEMS } from "@/lib/sdk/public-http";
import { submitWhatsAppDecision } from "@/lib/whatsapp/challenge-service";
import {
  errorResponse,
  internalError,
  json,
  limitWhatsAppRoute,
  readChallengeId,
  readJsonBody,
  readSessionToken,
} from "@/lib/whatsapp/http";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseSubmission(raw: unknown): ConsentSubmission | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const choice = String(row.choice ?? "");
  if (choice !== "accept-all" && choice !== "reject-all" && choice !== "granular") return null;
  const purposeDecisions = Array.isArray(row.purposeDecisions)
    ? row.purposeDecisions
        .slice(0, MAX_DECISION_ITEMS)
        .flatMap((item) => {
          if (!item || typeof item !== "object") return [];
          const entry = item as Record<string, unknown>;
          const purposeId = String(entry.purposeId ?? "");
          if (!UUID_RE.test(purposeId)) return [];
          return [{ purposeId, granted: entry.granted === true }];
        })
    : undefined;
  if (choice === "granular" && (!purposeDecisions || purposeDecisions.length === 0)) return null;
  return { choice, purposeDecisions, vendorDecisions: undefined };
}

// POST /api/consent/whatsapp/submit { challengeId, sessionToken, submission }
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "submit", 20);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const challengeId = readChallengeId(parsed.body);
    const sessionToken = readSessionToken(parsed.body);
    const submission = parseSubmission(parsed.body.submission);
    if (!challengeId || !sessionToken) return json({ success: false, message: "Invalid request" }, 400);
    if (!submission) {
      return json(
        { success: false, message: "submission.choice must be accept-all, reject-all, or granular" },
        400,
      );
    }

    const result = await submitWhatsAppDecision({ challengeId, sessionToken, submission });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, ...result }, result.idempotent ? 200 : 201);
  } catch (error) {
    return internalError("whatsapp.submit", error);
  }
}
