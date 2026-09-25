import { NextResponse } from "next/server";

import { recaptchaSiteKey, verifyRecaptcha } from "@/lib/recaptcha";
import { logger } from "@/lib/logger";
import { isNodemailerConfigured } from "@/lib/mail/send-email";
import { sendPricingEnquiryEmail } from "@/lib/mail/send-pricing-enquiry";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLANS = new Set(["silver", "gold", "platinum", "unsure"]);

export async function POST(request: Request) {
  try {
    const limit = await consumeRateLimit({
      key: `pricing-enquiry:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = (await request.json()) as Record<string, unknown>;
    const honeypot = String(body.companyUrl ?? "").trim();
    if (honeypot) {
      return NextResponse.json({ success: true, message: "Thanks. We will be in touch." });
    }

    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 320);
    const organisation = String(body.organisation ?? "").trim().slice(0, 200);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    const plan = String(body.plan ?? "").trim().toLowerCase();
    const message = String(body.message ?? "").trim().slice(0, 2000);

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid work email." }, { status: 400 });
    }
    if (organisation.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your organisation." }, { status: 400 });
    }
    if (!PLANS.has(plan)) {
      return NextResponse.json({ success: false, message: "Choose a plan interest." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json(
        { success: false, message: "Tell us a little more about what you need (at least 10 characters)." },
        { status: 400 },
      );
    }

    if (recaptchaSiteKey()) {
      const recaptchaToken = String(body.recaptchaToken ?? "").trim();
      const captchaOk = await verifyRecaptcha(recaptchaToken, getClientIp(request));
      if (!captchaOk) {
        return NextResponse.json(
          { success: false, message: "Security check failed. Try sending the enquiry again." },
          { status: 400 },
        );
      }
    }

    logger.info("pricing_enquiry_received", {
      plan,
      organisationLength: organisation.length,
      hasPhone: Boolean(phone),
    });

    if (!isNodemailerConfigured()) {
      logger.error("pricing_enquiry_mail_unconfigured");
      return NextResponse.json(
        { success: false, message: "Could not send the enquiry. Mail is not configured yet." },
        { status: 503 },
      );
    }

    await sendPricingEnquiryEmail({
      name,
      email,
      organisation,
      phone,
      plan,
      message,
    });

    return NextResponse.json({
      success: true,
      message: "Thanks. We received your pricing enquiry and will reply by email.",
    });
  } catch (error) {
    logger.error("pricing_enquiry_failed", { error });
    return NextResponse.json({ success: false, message: "Could not send the enquiry." }, { status: 502 });
  }
}
