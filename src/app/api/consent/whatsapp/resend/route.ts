import { resendWhatsAppOtp } from "@/lib/whatsapp/challenge-service";
import {
  errorResponse,
  internalError,
  json,
  limitWhatsAppRoute,
  readChallengeId,
  readJsonBody,
} from "@/lib/whatsapp/http";

export const runtime = "nodejs";

// POST /api/consent/whatsapp/resend { challengeId }
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "resend", 10);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const challengeId = readChallengeId(parsed.body);
    if (!challengeId) return json({ success: false, message: "Invalid request" }, 400);

    const result = await resendWhatsAppOtp({ challengeId });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, ...result });
  } catch (error) {
    return internalError("whatsapp.resend", error);
  }
}
