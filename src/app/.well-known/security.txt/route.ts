import { SITE_URL } from "@/lib/site-metadata";

export function GET() {
  const body = [
    "Contact: https://consentguru.com/security",
    "Contact: mailto:support@consentguru.com",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "Preferred-Languages: en",
    "Expires: 2027-09-20T00:00:00.000Z",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
