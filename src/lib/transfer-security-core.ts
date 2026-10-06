import { createCipheriv, createDecipheriv, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes, createPublicKey, type KeyObject } from "node:crypto";

export type TransferEnvelope = {
  version: 1;
  algorithm: "X25519-HKDF-SHA256-AES-256-GCM";
  id: string;
  transferId: string;
  authorizationId: string;
  recipientVendorId: string;
  recipientKeyId: string;
  createdAt: string;
  expiresAt: string;
  ephemeralPublicKey: string;
  salt: string;
  iv: string;
  ciphertext: string;
  authenticationTag: string;
};

export type TransferBinding = Pick<TransferEnvelope, "id" | "transferId" | "authorizationId" | "recipientVendorId" | "recipientKeyId" | "createdAt" | "expiresAt">;

const MAX_PLAINTEXT_BYTES = 1_000_000;
const MAX_KEY_BYTES = 512;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function transferAuthorizationFailure(input: {
  state: string; expiresAt: Date; revokedAt: Date | null; consumedAt: Date | null; singleUse: boolean;
  transferActive: boolean; recipientMatches: boolean; consentActive: boolean; exactPurposeGrant: boolean; sessionActive: boolean; recipientKeyActive: boolean;
}, now = new Date()): string | null {
  if (input.state !== "active" || input.revokedAt || input.expiresAt <= now) return "Authorization is expired, revoked, consumed, or unavailable";
  if (input.singleUse && input.consumedAt) return "Authorization is expired, revoked, consumed, or unavailable";
  if (!input.transferActive || !input.recipientMatches) return "Transfer, site, or recipient no longer matches the authorization";
  if (!input.consentActive) return "Consent is no longer active";
  if (!input.exactPurposeGrant) return "The exact purpose grant is no longer present";
  if (!input.sessionActive) return "The associated consent session is no longer active";
  if (!input.recipientKeyActive) return "Authorized recipient encryption key is no longer active";
  return null;
}

export function transferAuthorizationIssueFailure(input: {
  transferActive: boolean; transferIsSiteScoped: boolean; processingActivityActive: boolean; activityMatchesRecipient: boolean;
  activityMatchesSite: boolean; purposeMatchesActivity: boolean; recipientActive: boolean; recipientKeyMatches: boolean;
  consentActive: boolean; purposeGranted: boolean; recipientGranted: boolean; sessionValid: boolean; expiryValid: boolean;
}): string | null {
  if (!input.transferActive || !input.transferIsSiteScoped) return "An active site-scoped transfer is required";
  if (!input.processingActivityActive || !input.activityMatchesRecipient || !input.activityMatchesSite || !input.purposeMatchesActivity) return "The transfer must map to an active processing activity and its exact purpose";
  if (!input.recipientActive || !input.recipientKeyMatches) return "Recipient or active recipient key does not match the transfer";
  if (!input.consentActive || !input.purposeGranted || !input.recipientGranted) return "This consent record does not hold an active grant for this transfer purpose and recipient";
  if (!input.sessionValid) return "Consent session is not active for this record or expires before the authorization";
  if (!input.expiryValid) return "Authorization expiry must be valid and no later than the consent/session expiry";
  return null;
}

export function validateRecipientPublicKey(encoded: string): KeyObject {
  if (typeof encoded !== "string" || encoded.length > 900 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid recipient public key");
  const der = Buffer.from(encoded, "base64");
  if (!der.length || der.length > MAX_KEY_BYTES || der.toString("base64") !== encoded) throw new Error("Invalid recipient public key");
  const key = createPublicKey({ key: der, format: "der", type: "spki" });
  if (key.asymmetricKeyType !== "x25519") throw new Error("Recipient key must be X25519");
  return key;
}

export function createSecureTransferEnvelope(input: {
  plaintext: string | Record<string, unknown> | unknown[];
  recipientPublicKey: string;
  binding: TransferBinding;
}): TransferEnvelope {
  const payload = typeof input.plaintext === "string" ? input.plaintext : JSON.stringify(input.plaintext);
  if (typeof payload !== "string" || Buffer.byteLength(payload, "utf8") === 0 || Buffer.byteLength(payload, "utf8") > MAX_PLAINTEXT_BYTES) throw new Error("Transfer payload must be between 1 byte and 1 MB");
  for (const value of [input.binding.id, input.binding.transferId, input.binding.authorizationId, input.binding.recipientVendorId]) {
    if (!uuidPattern.test(value)) throw new Error("Invalid transfer binding");
  }
  if (!input.binding.recipientKeyId || input.binding.recipientKeyId.length > 80 || !Number.isFinite(Date.parse(input.binding.expiresAt)) || !Number.isFinite(Date.parse(input.binding.createdAt))) throw new Error("Invalid transfer binding");

  const recipientKey = validateRecipientPublicKey(input.recipientPublicKey);
  const ephemeral = generateKeyPairSync("x25519");
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipientKey });
  const salt = randomBytes(32);
  const metadata = canonicalMetadata(input.binding);
  const info = Buffer.from(`consent-guru-secure-transfer:v1:${metadata.toString("hex")}`, "utf8");
  const key = Buffer.from(hkdfSync("sha256", sharedSecret, salt, info, 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(metadata);
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ephemeralPublicKey = ephemeral.publicKey.export({ format: "der", type: "spki" }).toString("base64");
  sharedSecret.fill(0);
  key.fill(0);
  return {
    version: 1,
    algorithm: "X25519-HKDF-SHA256-AES-256-GCM",
    ...input.binding,
    ephemeralPublicKey,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    authenticationTag: tag.toString("base64"),
  };
}

/** Test/recipient-side reference implementation. Production APIs never decrypt envelopes. */
export function decryptSecureTransferEnvelope(envelope: TransferEnvelope, recipientPrivateKey: KeyObject, expected?: { recipientVendorId?: string; authorizationId?: string }, now = new Date()): string {
  if (envelope.version !== 1 || envelope.algorithm !== "X25519-HKDF-SHA256-AES-256-GCM") throw new Error("Unsupported transfer envelope");
  if (expected?.recipientVendorId && expected.recipientVendorId !== envelope.recipientVendorId) throw new Error("Recipient mismatch");
  if (expected?.authorizationId && expected.authorizationId !== envelope.authorizationId) throw new Error("Authorization mismatch");
  if (Date.parse(envelope.expiresAt) <= now.getTime()) throw new Error("Transfer envelope expired");
  const ephemeralPublicKey = createPublicKey({ key: decodeBase64(envelope.ephemeralPublicKey), format: "der", type: "spki" });
  if (ephemeralPublicKey.asymmetricKeyType !== "x25519" || recipientPrivateKey.asymmetricKeyType !== "x25519") throw new Error("Incorrect transfer key");
  const sharedSecret = diffieHellman({ privateKey: recipientPrivateKey, publicKey: ephemeralPublicKey });
  const salt = decodeBase64(envelope.salt);
  const metadata = canonicalMetadata(envelope);
  const info = Buffer.from(`consent-guru-secure-transfer:v1:${metadata.toString("hex")}`, "utf8");
  const key = Buffer.from(hkdfSync("sha256", sharedSecret, salt, info, 32));
  const decipher = createDecipheriv("aes-256-gcm", key, decodeBase64(envelope.iv));
  decipher.setAAD(metadata);
  decipher.setAuthTag(decodeBase64(envelope.authenticationTag));
  const plaintext = Buffer.concat([decipher.update(decodeBase64(envelope.ciphertext)), decipher.final()]).toString("utf8");
  sharedSecret.fill(0);
  key.fill(0);
  return plaintext;
}

function canonicalMetadata(binding: TransferBinding): Buffer {
  return Buffer.from(JSON.stringify({
    version: 1,
    id: binding.id,
    transferId: binding.transferId,
    authorizationId: binding.authorizationId,
    recipientVendorId: binding.recipientVendorId,
    recipientKeyId: binding.recipientKeyId,
    createdAt: binding.createdAt,
    expiresAt: binding.expiresAt,
  }), "utf8");
}

function decodeBase64(value: string): Buffer {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("Invalid envelope encoding");
  const decoded = Buffer.from(value, "base64");
  if (!decoded.length || decoded.length > MAX_PLAINTEXT_BYTES + MAX_KEY_BYTES || decoded.toString("base64") !== value) throw new Error("Invalid envelope encoding");
  return decoded;
}
