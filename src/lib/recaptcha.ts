import "server-only";

export function recaptchaSiteKey(): string {
  return (
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    ""
  );
}

export async function verifyRecaptcha(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET?.trim();
  if (!secret || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;

  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true;
}
