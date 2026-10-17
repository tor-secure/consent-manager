import { withdrawWhatsAppConsent } from "@/lib/whatsapp/challenge-service";
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

// POST /api/consent/whatsapp/withdraw { challengeId, sessionToken }
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "withdraw", 10);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const challengeId = readChallengeId(parsed.body);
    const sessionToken = readSessionToken(parsed.body);
    if (!challengeId || !sessionToken) return json({ success: false, message: "Invalid request" }, 400);

    const result = await withdrawWhatsAppConsent({ challengeId, sessionToken });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, summary: result.summary });
  } catch (error) {
    return internalError("whatsapp.withdraw", error);
  }
}
