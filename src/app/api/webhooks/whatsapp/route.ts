import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { claimInboundWebhook, releaseInboundWebhook } from "@/lib/webhooks/inbound-idempotency";
import {
  recordWhatsAppDeliveryStatus,
  withdrawLatestWhatsAppConsentForPhone,
} from "@/lib/whatsapp/challenge-service";
import { verifyWhatsAppWebhookSignature, whatsappVerifyToken } from "@/lib/whatsapp/cloud-api";

export const runtime = "nodejs";

const STOP_WORDS = new Set(["stop", "unsubscribe", "withdraw"]);

type StatusEvent = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number | string }>;
};

type InboundMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        statuses?: StatusEvent[];
        messages?: InboundMessage[];
      };
    }>;
  }>;
};

// Meta's subscription handshake.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = whatsappVerifyToken();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
}

function inboundText(message: InboundMessage): string {
  if (message.type === "text") return message.text?.body ?? "";
  if (message.type === "button") return message.button?.payload ?? message.button?.text ?? "";
  return "";
}

export async function POST(request: Request) {
  const payload = await request.text();
  const valid = verifyWhatsAppWebhookSignature({
    payload,
    header: request.headers.get("x-hub-signature-256"),
  });
  if (!valid) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = JSON.parse(payload) as WebhookPayload;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ success: true, ignored: true });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};

      for (const status of value.statuses ?? []) {
        const id = status.id?.trim();
        const state = status.status?.trim();
        if (!id || !state) continue;
        const eventId = `status:${id}:${state}`;
        const claim = await claimInboundWebhook({ provider: "whatsapp", eventId, eventType: "status" });
        if (!claim.claimed) continue;
        try {
          await recordWhatsAppDeliveryStatus({
            messageId: id,
            status: state,
            errorCode: status.errors?.[0]?.code != null ? String(status.errors[0].code) : null,
          });
        } catch (error) {
          await releaseInboundWebhook("whatsapp", eventId).catch(() => undefined);
          logger.error("WhatsApp status webhook failed", { operation: "whatsapp.webhook.status", error });
        }
      }

      for (const message of value.messages ?? []) {
        const id = message.id?.trim();
        const from = message.from?.trim();
        if (!id || !from) continue;
        const text = inboundText(message).trim().toLowerCase();
        if (!STOP_WORDS.has(text)) continue;
        const eventId = `message:${id}`;
        const claim = await claimInboundWebhook({ provider: "whatsapp", eventId, eventType: "stop" });
        if (!claim.claimed) continue;
        try {
          const result = await withdrawLatestWhatsAppConsentForPhone({ phone: from, inboundMessageId: id });
          if (!result.ok && result.code !== "nothing_to_withdraw" && result.code !== "already_withdrawn") {
            logger.warn("WhatsApp STOP could not withdraw", {
              operation: "whatsapp.webhook.stop",
              code: result.code,
            });
          }
        } catch (error) {
          await releaseInboundWebhook("whatsapp", eventId).catch(() => undefined);
          logger.error("WhatsApp STOP webhook failed", { operation: "whatsapp.webhook.stop", error });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}
