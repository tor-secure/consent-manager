import "server-only";

import {
  buildRevocationEmailContent,
  type PreferenceChangeItem,
  type RevokedItem,
} from "@/lib/consent/revocation-notification-core";
import { sendWithNodemailer } from "@/lib/mail/send-email";

export async function sendConsentRevocationEmail(input: {
  to: string;
  websiteName: string;
  revokedAt: Date;
  timeZone?: string;
  items: Array<RevokedItem | PreferenceChangeItem>;
  preferencesUrl?: string | null;
}): Promise<void> {
  const content = buildRevocationEmailContent({
    websiteName: input.websiteName,
    revokedAt: input.revokedAt,
    timeZone: input.timeZone,
    items: input.items,
    preferencesUrl: input.preferencesUrl,
  });

  await sendWithNodemailer({
    to: [input.to],
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
}
