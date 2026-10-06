import { NextResponse } from "next/server";

import { recaptchaSiteKey, verifyRecaptcha } from "@/lib/recaptcha";
import { logger } from "@/lib/logger";
import { isNodemailerConfigured } from "@/lib/mail/send-email";
import { sendDpoEnquiryEmail } from "@/lib/mail/send-dpo-enquiry";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTERESTS = new Set(["business", "professional"]);
const TIERS = new Set(["essential", "professional", "enterprise", "unsure"]);

export async function POST(request: Request) {
  try {
    const limit = await consumeRateLimit({
      key: `dpo-enquiry:${getClientIp(request)}`,
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
    const interest = String(body.interest ?? "").trim().toLowerCase();
    const tier = String(body.tier ?? "unsure").trim().toLowerCase();
    const message = String(body.message ?? "").trim().slice(0, 2000);

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, message: "Enter a valid email." }, { status: 400 });
    }
    if (!INTERESTS.has(interest)) {
      return NextResponse.json({ success: false, message: "Choose whether you need a DPO or want to join the network." }, { status: 400 });
    }
    if (interest === "business" && organisation.length < 2) {
      return NextResponse.json({ success: false, message: "Enter your organisation." }, { status: 400 });
    }
    if (!TIERS.has(tier)) {
      return NextResponse.json({ success: false, message: "Choose a service level interest, or Not sure yet." }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json(
        { success: false, message: "Tell us a little more (at least 10 characters)." },
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

    logger.info("dpo_enquiry_received", {
      interest,
      tier,
      organisationLength: organisation.length,
      hasPhone: Boolean(phone),
    });

    if (!isNodemailerConfigured()) {
      logger.error("dpo_enquiry_mail_unconfigured");
      return NextResponse.json(
        { success: false, message: "Could not send the enquiry. Mail is not configured yet." },
        { status: 503 },
      );
    }

    await sendDpoEnquiryEmail({
      name,
      email,
      organisation,
      phone,
      interest,
      tier,
      message,
    });

    return NextResponse.json({
      success: true,
      message: "Thanks. We received your enquiry and will reply by email.",
    });
  } catch (error) {
    logger.error("dpo_enquiry_failed", { error });
    return NextResponse.json({ success: false, message: "Could not send the enquiry." }, { status: 502 });
  }
}
