import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  const material =
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY?.trim() ||
    process.env.POLICY_CONTEXT_SECRET?.trim() ||
    process.env.CONSENT_PROOF_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "cmp-dev-webhook-secret");
  if (!material) {
    throw new Error("WEBHOOK_SECRET_ENCRYPTION_KEY or POLICY_CONTEXT_SECRET is required in production");
  }
  return createHash("sha256").update(material).digest();
}

export function encryptWebhookSigningSecret(raw: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function hmacKeyFromStoredWebhookSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const blob = Buffer.from(stored.slice(PREFIX.length), "base64url");
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
