import { startWhatsAppChallenge } from "@/lib/whatsapp/challenge-service";
import {
  errorResponse,
  internalError,
  json,
  limitWhatsAppRoute,
  readJsonBody,
} from "@/lib/whatsapp/http";
import { isValidSiteKey } from "@/lib/sdk/public-http";

export const runtime = "nodejs";

// POST /api/consent/whatsapp/start { siteKey, phone }
// Public. Creates a challenge and sends the OTP template.
export async function POST(request: Request) {
  try {
    const limited = await limitWhatsAppRoute(request, "start", 10);
    if (limited) return limited;

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const siteKey = String(parsed.body.siteKey ?? "").trim();
    const phone = String(parsed.body.phone ?? "").trim();
    if (!isValidSiteKey(siteKey)) {
      return json({ success: false, message: "Invalid siteKey" }, 400);
    }
    if (!phone || phone.length > 32) {
      return json({ success: false, message: "Enter a mobile number" }, 400);
    }

    const result = await startWhatsAppChallenge({ siteKey, phone, headers: request.headers });
    if (!result.ok) return errorResponse(result);
    return json({ success: true, ...result }, 201);
  } catch (error) {
    return internalError("whatsapp.start", error);
  }
}
