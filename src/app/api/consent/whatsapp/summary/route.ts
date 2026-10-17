import { getWhatsAppConsentSummary } from "@/lib/whatsapp/challenge-service";
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

// POST /api/consent/whatsapp/summary { challengeId, sessionToken }
// POST so the session token never appears in a URL or server log.
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "summary", 60);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const challengeId = readChallengeId(parsed.body);
    const sessionToken = readSessionToken(parsed.body);
    if (!challengeId || !sessionToken) return json({ success: false, message: "Invalid request" }, 400);

    const result = await getWhatsAppConsentSummary({ challengeId, sessionToken });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, summary: result.summary });
  } catch (error) {
    return internalError("whatsapp.summary", error);
  }
}
