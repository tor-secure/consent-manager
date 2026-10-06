import "server-only";

import { sendWithNodemailer } from "@/lib/mail/send-email";

export const DPO_ENQUIRY_RECIPIENTS = ["torsecure.dev@gmail.com"] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendDpoEnquiryEmail(input: {
  name: string;
  email: string;
  organisation: string;
  phone: string;
  interest: string;
  tier: string;
  message: string;
}): Promise<void> {
  const interestLabel = input.interest === "professional" ? "Join as a DPO" : "Get a DPO";
  const phone = input.phone || "Not provided";
  const organisation = input.organisation || "Not provided";
  const tier = input.tier || "Not specified";
  const text = [
    "New Consent Guru DPO-as-a-Service enquiry",
    "",
    `Interest: ${interestLabel}`,
    `Tier: ${tier}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Organisation: ${organisation}`,
    `Phone: ${phone}`,
    "",
    "Message:",
    input.message,
  ].join("\n");

  const html = `
    <h2>New Consent Guru DPO-as-a-Service enquiry</h2>
    <p><strong>Interest:</strong> ${escapeHtml(interestLabel)}</p>
    <p><strong>Tier:</strong> ${escapeHtml(tier)}</p>
    <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Organisation:</strong> ${escapeHtml(organisation)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message).replaceAll("\n", "<br />")}</p>
  `;

  await sendWithNodemailer({
    to: [...DPO_ENQUIRY_RECIPIENTS],
    replyTo: input.email,
    subject: `DPO enquiry (${interestLabel}) from ${input.name}`,
    text,
    html,
  });
}
