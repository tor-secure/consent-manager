import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyClerkSvixSignature(input: {
  payload: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret: string;
  nowMs?: number;
}): boolean {
  const { payload, svixId, svixTimestamp, svixSignature, secret } = input;
  if (!svixId || !svixTimestamp || !svixSignature || !secret) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) return false;
  const now = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(now - timestamp) > 5 * 60) return false;

  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");
  const signed = `${svixId}.${svixTimestamp}.${payload}`;
  const expected = createHmac("sha256", secretBytes).update(signed).digest("base64");

  const signatures = svixSignature.split(" ").map((part) => {
    const idx = part.indexOf(",");
    return idx >= 0 ? part.slice(idx + 1) : part.replace(/^v1,/, "").replace(/^v1=/, "");
  });

  const expectedBuf = Buffer.from(expected);
  return signatures.some((signature) => {
    try {
      const actual = Buffer.from(signature);
      return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
    } catch {
      return false;
    }
  });
}
