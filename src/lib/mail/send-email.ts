import "server-only";

const DEFAULT_FROM = "Consent Guru <noreply@consentguru.com>";

export type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

function fromAddress(fallbackUser?: string): string {
  return (
    process.env.CONSENT_SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    fallbackUser?.trim() ||
    DEFAULT_FROM
  );
}

async function sendWithResend(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: input.to,
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status}).`);
  }
}

function consentSmtpPassword(): string {
  return (
    process.env.CONSENT_SMTP_PASS?.trim() ||
    process.env.CONSENT_SMTP_PASSWORD?.trim() ||
    ""
  );
}

function consentSmtpUser(): string {
  return process.env.CONSENT_SMTP_USER?.trim() || "";
}

function consentSmtpHost(): string {
  return process.env.CONSENT_SMTP_HOST?.trim() || "";
}

export function isNodemailerConfigured(): boolean {
  return Boolean(consentSmtpPassword() && consentSmtpHost() && consentSmtpUser());
}

/** SMTP via Nodemailer. Credentials and sender come only from CONSENT_SMTP_* env vars. */
export async function sendWithNodemailer(input: SendEmailInput): Promise<void> {
  const pass = consentSmtpPassword();
  const host = consentSmtpHost();
  const user = consentSmtpUser();
  if (!pass || !host || !user) {
    throw new Error(
      "Consent SMTP is not configured. Set CONSENT_SMTP_HOST, CONSENT_SMTP_USER, and CONSENT_SMTP_PASS.",
    );
  }

  const port = Number(process.env.CONSENT_SMTP_PORT ?? "587");
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.CONSENT_SMTP_SECURE === "1" || port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: fromAddress(user),
    to: input.to.join(", "),
    replyTo: input.replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() || isNodemailerConfigured());
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (isNodemailerConfigured()) {
    await sendWithNodemailer(input);
    return;
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend(input);
    return;
  }
  throw new Error("Mail is not configured.");
}
