import "server-only";

import { sendEmail } from "@/lib/mail/send-email";
import { SITE_URL } from "@/lib/site-metadata";

/** Fixed recovery inbox for e-learning admin password resets. */
export const ELEARNING_ADMIN_RESET_RECIPIENT = "consentguruofficial@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function issuedAtLabel(date = new Date()): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function sendElearningAdminPasswordResetEmail(input: {
  username: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  const username = escapeHtml(input.username);
  const resetUrl = escapeHtml(input.resetUrl);
  const issued = escapeHtml(issuedAtLabel());
  const expiresIn = String(input.expiresInMinutes);
  // JPG is more reliable across email clients than SVG.
  const logoUrl = `${SITE_URL}/brand/consent-guru-logo.jpg`;

  const text = [
    "Consent Guru — E-learning Admin Password Reset",
    "",
    "Hello,",
    "",
    "A password reset was requested for the Consent Guru e-learning admin panel.",
    "Open the link below to choose a new password. Your current password stays active until you complete the form.",
    "",
    `Username: ${input.username}`,
    `Reset link: ${input.resetUrl}`,
    `This link expires in ${input.expiresInMinutes} minutes.`,
    `Requested: ${issuedAtLabel()} (IST)`,
    "",
    "For security:",
    "- Only use this link on a trusted device.",
    "- If you did not request this reset, ignore this email. Your password was not changed.",
    "",
    "This is an automated message from Consent Guru.",
    "Do not reply to this email with passwords or other sensitive information.",
    "",
    `© ${new Date().getFullYear()} Consent Guru · ${SITE_URL}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>E-learning admin password reset</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;color:#0B2C4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 18px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0B2C4A 0%,#0f3d5c 55%,#0a6b63 100%);padding:28px 28px 24px;">
              <img src="${escapeHtml(logoUrl)}" alt="Consent Guru" height="32" style="display:block;height:32px;width:auto;border:0;" />
              <p style="margin:18px 0 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#7FE8D6;">
                E-learning admin
              </p>
              <h1 style="margin:8px 0 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
                Choose a new password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#36505c;">
                Hello,
              </p>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#36505c;">
                A password reset was requested for the <strong style="color:#0B2C4A;">Consent Guru e-learning admin</strong> panel
                (<strong style="color:#0B2C4A;">${username}</strong>).
                Open the secure link below to set a new password. Your current password stays active until you finish the form.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3FAF8;border:1px solid #D7EFE9;border-radius:12px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#00A88F;">
                      Reset details
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.55;color:#0B2C4A;">
                      Link expires in <strong>${expiresIn} minutes</strong>.<br />
                      Requested ${issued} (IST).
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
                <tr>
                  <td align="center" bgcolor="#0B2C4A" style="border-radius:10px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                      Set new password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#4d6570;">
                Or copy this link:<br />
                <a href="${resetUrl}" style="color:#0B2C4A;word-break:break-all;">${resetUrl}</a>
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background:#FFF8F0;border:1px solid #F0E0C8;border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9A6700;">
                      Security notice
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#5C4A2A;">
                      If you did not request this password reset, ignore this email. Your password was not changed.
                      Do not forward this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;border-top:1px solid #EEF2F1;background:#FBFDFC;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#6B7280;">
                This is an automated message from Consent Guru. Please do not reply with passwords or other sensitive information.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9CA3AF;">
                © ${new Date().getFullYear()} Consent Guru ·
                <a href="${escapeHtml(SITE_URL)}" style="color:#0B2C4A;text-decoration:none;">www.consentguru.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendEmail({
    to: [ELEARNING_ADMIN_RESET_RECIPIENT],
    subject: "Set a new password · Consent Guru E-learning Admin",
    text,
    html,
  });
}
