import { verifyWhatsAppOtp } from "@/lib/whatsapp/challenge-service";
import {
  errorResponse,
  internalError,
  json,
  limitWhatsAppRoute,
  readChallengeId,
  readJsonBody,
} from "@/lib/whatsapp/http";
import { isValidOtpFormat } from "@/lib/whatsapp/otp";

export const runtime = "nodejs";

// POST /api/consent/whatsapp/verify { challengeId, code }
// A correct code returns a session token plus the notice for that policy version.
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "verify", 30);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const challengeId = readChallengeId(parsed.body);
    const code = String(parsed.body.code ?? "").replace(/\s+/g, "");
    if (!challengeId) return json({ success: false, message: "Invalid request" }, 400);
    if (!isValidOtpFormat(code)) {
      return json({ success: false, code: "otp_format", message: "Enter the 6-digit code" }, 400);
    }

    const result = await verifyWhatsAppOtp({ challengeId, code });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, ...result });
  } catch (error) {
    return internalError("whatsapp.verify", error);
  }
}
