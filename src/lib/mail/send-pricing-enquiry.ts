import "server-only";

import { sendWithNodemailer } from "@/lib/mail/send-email";

export const PRICING_ENQUIRY_RECIPIENTS = ["torsecure.dev@gmail.com"] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPricingEnquiryEmail(input: {
  name: string;
  email: string;
  organisation: string;
  phone: string;
  plan: string;
  message: string;
}): Promise<void> {
  const planLabel = input.plan.charAt(0).toUpperCase() + input.plan.slice(1);
  const phone = input.phone || "Not provided";
  const text = [
    "New Consent Guru pricing enquiry",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Organisation: ${input.organisation}`,
    `Phone: ${phone}`,
    `Plan: ${planLabel}`,
    "",
    "Message:",
    input.message,
  ].join("\n");

  const html = `
    <h2>New Consent Guru pricing enquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Organisation:</strong> ${escapeHtml(input.organisation)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message).replaceAll("\n", "<br />")}</p>
  `;

  await sendWithNodemailer({
    to: [...PRICING_ENQUIRY_RECIPIENTS],
    replyTo: input.email,
    subject: `Pricing enquiry (${planLabel}) from ${input.organisation}`,
    text,
    html,
  });
}
