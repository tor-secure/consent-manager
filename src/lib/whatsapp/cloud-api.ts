import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";
import { phoneForCloudApi } from "./phone";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v21.0";
const SEND_TIMEOUT_MS = 10_000;

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; status: number; code: string; message: string };

type TemplateComponent =
  | { type: "body"; parameters: Array<{ type: "text"; text: string }> }
  | {
      type: "button";
      sub_type: "url";
      index: string;
      parameters: Array<{ type: "text"; text: string }>;
    };

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

function templateLanguage(): string {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en";
}

async function sendTemplate(input: {
  to: string;
  templateName: string;
  components: TemplateComponent[];
}): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { ok: false, status: 503, code: "not_configured", message: "WhatsApp is not configured" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneForCloudApi(input.to),
          type: "template",
          template: {
            name: input.templateName,
            language: { code: templateLanguage() },
            components: input.components,
          },
        }),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string; error_subcode?: number };
    };
    if (!response.ok) {
      logger.warn("WhatsApp template send rejected", {
        operation: "whatsapp.send",
        template: input.templateName,
        status: response.status,
        code: payload.error?.code,
        subcode: payload.error?.error_subcode,
      });
      return {
        ok: false,
        status: response.status,
        code: String(payload.error?.code ?? "send_failed"),
        message: payload.error?.message ?? "WhatsApp rejected the message",
      };
    }
    const messageId = payload.messages?.[0]?.id?.trim();
    if (!messageId) {
      return { ok: false, status: 502, code: "no_message_id", message: "WhatsApp returned no message id" };
    }
    return { ok: true, messageId };
  } catch (error) {
    logger.error("WhatsApp template send failed", {
      operation: "whatsapp.send",
      template: input.templateName,
      error,
    });
    return { ok: false, status: 502, code: "network", message: "Could not reach WhatsApp" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authentication template. Meta's authentication category fixes the body to
 * "{{1}} is your verification code" and the copy-code button also takes the
 * code. Both parameters are therefore the OTP.
 */
export function sendOtpTemplate(input: { to: string; code: string }): Promise<WhatsAppSendResult> {
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE?.trim() || "consent_otp";
  return sendTemplate({
    to: input.to,
    templateName,
    components: [
      { type: "body", parameters: [{ type: "text", text: input.code }] },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: input.code }],
      },
    ],
  });
}

/**
 * Utility template sent only after the consent record is saved.
 * Expected body: "Your consent for sharing your health information with {{1}}
 * has been successfully recorded. Date: {{2}} Time: {{3}} Reference: {{4}}".
 */
export function sendConsentConfirmationTemplate(input: {
  to: string;
  websiteName: string;
  consentId: string;
  recordedAt: Date;
}): Promise<WhatsAppSendResult> {
  const templateName = process.env.WHATSAPP_CONFIRM_TEMPLATE?.trim() || "consent_confirmed";
  const timeZone = process.env.WHATSAPP_TIMEZONE?.trim() || "Asia/Kolkata";
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone }).format(input.recordedAt);
  const time = new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone }).format(input.recordedAt);
  return sendTemplate({
    to: input.to,
    templateName,
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: input.websiteName.slice(0, 60) },
          { type: "text", text: date },
          { type: "text", text: time },
          { type: "text", text: input.consentId.slice(0, 60) },
        ],
      },
    ],
  });
}

export function otpTemplateName(): string {
  return process.env.WHATSAPP_OTP_TEMPLATE?.trim() || "consent_otp";
}

/** Meta signs webhook bodies with the app secret: sha256=<hex>. */
export function verifyWhatsAppWebhookSignature(input: {
  payload: string;
  header: string | null;
}): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return false;
  const header = (input.header ?? "").trim();
  if (!header.startsWith("sha256=")) return false;
  const provided = header.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(provided)) return false;
  const expected = createHmac("sha256", secret).update(input.payload, "utf8").digest("hex");
  const left = Buffer.from(provided, "hex");
  const right = Buffer.from(expected, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function whatsappVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? "";
}
