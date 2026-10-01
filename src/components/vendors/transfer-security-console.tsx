"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Transfer = { id: string; vendorId: string; websiteId: string | null; processingActivityId: string | null; status: string; destinationCountry: string | null; destinationRegion: string | null };
type Vendor = { id: string; name: string };
type Activity = { id: string; purposeId: string | null; description: string | null };
type Purpose = { id: string; name: string };
type RecipientKey = { id: string; vendorId: string; keyId: string; status: string };
type Authorization = { id: string; transferId: string; recipientVendorId: string; recipientKeyId: string; consentRecordId: string; sessionId: string | null; purposeId: string; state: string; expiresAt: string; issuedAt: string; singleUse: boolean; consumedAt: string | null; recipientName: string; purposeName: string; recipientKeyName: string };
type EnvelopeRow = { id: string; transferId: string; authorizationId: string; recipientVendorId: string; status: string; expiresAt: string; createdAt: string; envelope: Record<string, unknown> };
type EligibleConsent = { id: string; consentId: string; consentedAt: string | null };
const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";

export function TransferSecurityConsole({ transfers, vendors, activities, purposes }: { transfers: Transfer[]; vendors: Vendor[]; activities: Activity[]; purposes: Purpose[] }) {
  const [keys, setKeys] = useState<RecipientKey[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeRow[]>([]);
  const [transferId, setTransferId] = useState(transfers[0]?.id ?? "");
  const [recipientKeyId, setRecipientKeyId] = useState("");
  const [consentRecordId, setConsentRecordId] = useState("");
  const [eligibleConsents, setEligibleConsents] = useState<EligibleConsent[]>([]);
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  const [payload, setPayload] = useState("");
  const [keyVendorId, setKeyVendorId] = useState(vendors[0]?.id ?? "");
  const [keyName, setKeyName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [selectedAuthorizationId, setSelectedAuthorizationId] = useState("");
  const [latestEnvelope, setLatestEnvelope] = useState<EnvelopeRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedTransfer = transfers.find((row) => row.id === transferId);
  const activeKeys = useMemo(() => keys.filter((key) => key.status === "active" && key.vendorId === selectedTransfer?.vendorId), [keys, selectedTransfer]);
  const activeAuthorizations = useMemo(() => authorizations.filter((row) => row.state === "active" && new Date(row.expiresAt) > new Date()), [authorizations]);
  const activity = activities.find((row) => row.id === selectedTransfer?.processingActivityId);
  const selectedPurpose = purposes.find((purpose) => purpose.id === activity?.purposeId);

  const load = useCallback(async () => {
    try {
      const responses = await Promise.all(["/api/transfers/recipient-keys", "/api/transfer-authorizations", "/api/secure-transfers"].map((url) => fetch(url, { cache: "no-store" })));
      const data = await Promise.all(responses.map((response) => response.json()));
      if (responses.some((response) => !response.ok)) throw new Error("Unable to load transfer security data");
      setKeys(data[0].keys ?? []); setAuthorizations(data[1].authorizations ?? []); setEnvelopes(data[2].transfers ?? []);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load transfer security data"); }
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const responses = await Promise.all(["/api/transfers/recipient-keys", "/api/transfer-authorizations", "/api/secure-transfers"].map((url) => fetch(url, { cache: "no-store" })));
        const data = await Promise.all(responses.map((response) => response.json()));
        if (!responses.every((response) => response.ok)) throw new Error("Unable to load transfer security data");
        if (active) { setKeys(data[0].keys ?? []); setAuthorizations(data[1].authorizations ?? []); setEnvelopes(data[2].transfers ?? []); }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Unable to load transfer security data"); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selectedTransfer) return;
    fetch("/api/transfer-authorizations?eligibleTransferId=" + encodeURIComponent(selectedTransfer.id), { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message || "Unable to load eligible consent records"); setEligibleConsents(data.eligibleConsents ?? []); })
      .catch((err) => { setEligibleConsents([]); setError(err instanceof Error ? err.message : "Unable to load eligible consent records"); });
  }, [selectedTransfer]);

  async function submit(url: string, body: unknown, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Request failed");
      if (data.transfer?.envelope) setLatestEnvelope(data.transfer);
      setNotice(success); await load(); return data;
    } catch (err) { setError(err instanceof Error ? err.message : "Request failed"); return null; }
    finally { setBusy(false); }
  }
  async function registerKey(event: FormEvent) {
    event.preventDefault();
    const data = await submit("/api/transfers/recipient-keys", { vendorId: keyVendorId, keyId: keyName.trim(), publicKeySpki: publicKey.trim() }, "Recipient public key registered.");
    if (data) { setKeyName(""); setPublicKey(""); }
  }
  async function issueAuthorization(event: FormEvent) {
    event.preventDefault();
    if (!selectedTransfer?.processingActivityId || !activity?.purposeId || !recipientKeyId || !consentRecordId) { setError("Choose a transfer, active recipient key, and consent record with the activity purpose explicitly granted."); return; }
    await submit("/api/transfer-authorizations", { transferId, consentRecordId, purposeId: activity.purposeId, recipientKeyId, expiresAt: new Date(expiresAt).toISOString(), singleUse: true }, "Single-use transfer authorization issued.");
  }
  async function createEnvelope(event: FormEvent) {
    event.preventDefault();
    let content: unknown = payload;
    try { content = JSON.parse(payload); } catch { /* Text payload is also supported. */ }
    const encoded = typeof content === "string" ? content : JSON.stringify(content);
    if (new TextEncoder().encode(encoded).length > 1000000) { setError("Payload exceeds the 1 MB limit."); return; }
    await submit("/api/secure-transfers", { authorizationId: selectedAuthorizationId, idempotencyKey: crypto.randomUUID(), payload: content }, "Encrypted envelope created. Plaintext was not persisted.");
  }
  async function changeStatus(url: string, id: string, status: string) {
    const action = status === "revoked" ? "Revoke this item? Any ready envelope will become unavailable." : "Record that this envelope was delivered? This is an operator attestation.";
    if (!window.confirm(action)) return;
    setBusy(true); setError(""); setNotice("");
    setLatestEnvelope(null);
    try {
      const response = await fetch(url + "/" + id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Status update failed");
      setNotice(status === "revoked" ? "Authorization or transfer revoked." : "Transfer marked delivered. This is an operator attestation.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Status update failed"); }
    finally { setBusy(false); }
  }
  function downloadEnvelope(row: EnvelopeRow) {
    const blob = new Blob([JSON.stringify(row.envelope, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = href; link.download = "consent-guru-transfer-" + row.id + ".json"; link.click(); URL.revokeObjectURL(href);
  }
  async function downloadStoredEnvelope(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/secure-transfers/" + id, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Envelope is no longer available");
      downloadEnvelope(data.transfer);
    } catch (err) { setError(err instanceof Error ? err.message : "Envelope is no longer available"); await load(); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="transfer-security-heading" className="space-y-5">
    <div><h2 id="transfer-security-heading" className="text-xl font-semibold">Transfer authorization and secure delivery</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Each transfer requires a purpose-specific consent decision, a named vendor recipient, and an active recipient public key. Generic consent does not authorize a transfer.</p></div>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={registerKey} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h3 className="font-semibold">Register recipient public key</h3><p className="text-xs text-[var(--muted-foreground)]">Register an X25519 SubjectPublicKeyInfo key supplied by the vendor. Private keys must remain with that recipient.</p>
        <label className="block text-sm">Recipient vendor<select className="field-input mt-1" value={keyVendorId} onChange={(event) => setKeyVendorId(event.target.value)} required>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
        <label className="block text-sm">Key ID<input className="field-input mt-1" value={keyName} onChange={(event) => setKeyName(event.target.value)} minLength={3} maxLength={80} required /></label>
        <label className="block text-sm">Public key (base64 SPKI DER)<textarea className="field-input mt-1 font-mono text-xs" rows={3} value={publicKey} onChange={(event) => setPublicKey(event.target.value)} maxLength={900} required /></label>
        <button className="btn btn-outline btn-sm" disabled={busy || !vendors.length}>Register public key</button>
      </form>
      <form onSubmit={issueAuthorization} className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h3 className="font-semibold">Issue transfer authorization</h3>
        <label className="block text-sm">Existing transfer<select className="field-input mt-1" value={transferId} onChange={(event) => { setTransferId(event.target.value); setRecipientKeyId(""); setConsentRecordId(""); setEligibleConsents([]); }} required>{transfers.filter((row) => row.status === "active").map((row) => <option key={row.id} value={row.id}>{vendors.find((vendor) => vendor.id === row.vendorId)?.name ?? "Vendor"} · {row.destinationCountry || row.destinationRegion || "destination unspecified"}</option>)}</select></label>
        <p className="text-xs text-[var(--muted-foreground)]">Processing purpose: {selectedPurpose?.name ?? "No linked purpose"}</p>
        <label className="block text-sm">Recipient key<select className="field-input mt-1" value={recipientKeyId} onChange={(event) => setRecipientKeyId(event.target.value)} required><option value="">Select active vendor key</option>{activeKeys.map((key) => <option key={key.id} value={key.id}>{key.keyId}</option>)}</select></label>
        <label className="block text-sm">Consent record with matching grant<select className="field-input mt-1" value={consentRecordId} onChange={(event) => setConsentRecordId(event.target.value)} required><option value="">Select eligible consent record</option>{eligibleConsents.map((row) => <option key={row.id} value={row.id}>{row.consentId} · {dateLabel(row.consentedAt)}</option>)}</select></label>
        <label className="block text-sm">Authorization expires<input type="datetime-local" className="field-input mt-1" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required /></label>
        <button className="btn btn-primary btn-sm" disabled={busy || !transfers.length || !selectedPurpose}>Issue single-use authorization</button>
      </form>
    </div>
    <div className="rounded-xl border border-[var(--border)] p-4"><h3 className="font-semibold">Recipient keys</h3>{keys.length === 0 ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">No recipient public keys registered.</p> : <ul className="mt-3 space-y-2">{keys.map((key) => <li key={key.id} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--muted)] p-3 text-sm"><span>{vendors.find((vendor) => vendor.id === key.vendorId)?.name ?? "Vendor"} · {key.keyId} · {key.status}</span>{key.status === "active" && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void changeStatus("/api/transfers/recipient-keys", key.id, "revoked")}>Revoke key</button>}</li>)}</ul>}</div>
    <form onSubmit={createEnvelope} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50/50 p-4">
      <h3 className="font-semibold">Create encrypted transfer envelope</h3><p className="text-xs text-[var(--muted-foreground)]">Security-sensitive operation. The payload is transiently received by the server, encrypted before persistence, and limited to 1 MB. Submit only data you are authorized to transfer.</p>
      <label className="block text-sm">Active authorization<select className="field-input mt-1" value={selectedAuthorizationId} onChange={(event) => setSelectedAuthorizationId(event.target.value)} required><option value="">Select authorization</option>{activeAuthorizations.map((row) => <option key={row.id} value={row.id}>{row.recipientName} · {row.purposeName} · expires {dateLabel(row.expiresAt)}</option>)}</select></label>
      <label className="block text-sm">Payload (JSON or text)<textarea className="field-input mt-1 font-mono text-xs" rows={6} value={payload} onChange={(event) => setPayload(event.target.value)} maxLength={1000000} required /></label>
      <button className="btn btn-primary btn-sm" disabled={busy || !selectedAuthorizationId || !payload}>Encrypt and prepare transfer</button>
    </form>
    {latestEnvelope && <div className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Encrypted envelope ready</h3><p className="text-xs text-[var(--muted-foreground)]">ID {latestEnvelope.id} · recipient {vendors.find((vendor) => vendor.id === latestEnvelope.recipientVendorId)?.name ?? "vendor"} · expires {dateLabel(latestEnvelope.expiresAt)}</p></div><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void downloadStoredEnvelope(latestEnvelope.id)}>Download encrypted envelope</button></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">Deliver using your approved recipient channel. Only ciphertext and authenticated metadata are stored.</p></div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--border)] p-4"><h3 className="font-semibold">Authorizations</h3>{authorizations.length === 0 ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">No transfer authorizations yet.</p> : <ul className="mt-3 space-y-2">{authorizations.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--muted)] p-3 text-sm"><span><strong>{row.recipientName}</strong> · {row.purposeName}<span className="block text-xs text-[var(--muted-foreground)]">Authorized by a current grant for consent {row.consentRecordId.slice(0, 8)}…{row.sessionId ? ` · session ${row.sessionId.slice(0, 8)}…` : " · no active session linked"}</span><span className="block text-xs text-[var(--muted-foreground)]">Recipient key {row.recipientKeyName} · {row.state} · issued {dateLabel(row.issuedAt)} · expires {dateLabel(row.expiresAt)}{row.consumedAt ? " · consumed" : ""}</span></span>{["active", "consumed"].includes(row.state) && <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void changeStatus("/api/transfer-authorizations", row.id, "revoked")}>Revoke</button>}</li>)}</ul>}</div>
      <div className="rounded-xl border border-[var(--border)] p-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Secure transfer history</h3><button type="button" className="text-xs underline" disabled={busy} onClick={() => { setLatestEnvelope(null); void load(); }}>Refresh</button></div>{envelopes.length === 0 ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">No encrypted transfers yet.</p> : <ul className="mt-3 space-y-2">{envelopes.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--muted)] p-3 text-sm"><span><strong>{vendors.find((vendor) => vendor.id === row.recipientVendorId)?.name ?? "Vendor"}</strong> · {row.status}<span className="block text-xs text-[var(--muted-foreground)]">{dateLabel(row.createdAt)} · expires {dateLabel(row.expiresAt)} · ciphertext only</span></span><span className="flex gap-2">{row.status === "ready" && <><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void downloadStoredEnvelope(row.id)}>Download</button><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void changeStatus("/api/secure-transfers", row.id, "delivered")}>Mark delivered</button><button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => void changeStatus("/api/secure-transfers", row.id, "revoked")}>Revoke</button></>}</span></li>)}</ul>}</div>
    </div>
  </section>;
}
