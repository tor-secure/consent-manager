import "server-only";

const DEFAULT_FROM = "Consent Guru <noreply@consentguru.com>";

export type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

function fromAddress(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
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
    throw new Error(`Resend rejected the pricing enquiry email (${response.status}).`);
  }
}

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_USER = "torsecure.dev@gmail.com";

function smtpPassword(): string {
  return process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim() || "";
}

export function isNodemailerConfigured(): boolean {
  return Boolean(smtpPassword());
}

/** Gmail SMTP via Nodemailer. Host and user default to the pricing inbox. */
export async function sendWithNodemailer(input: SendEmailInput): Promise<void> {
  const pass = smtpPassword();
  if (!pass) {
    throw new Error("SMTP password is not configured.");
  }

  const host = process.env.SMTP_HOST?.trim() || GMAIL_SMTP_HOST;
  const user = process.env.SMTP_USER?.trim() || GMAIL_SMTP_USER;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "1" || port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM?.trim() || process.env.MAIL_FROM?.trim() || user,
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
