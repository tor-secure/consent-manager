const assert = require("node:assert/strict");
const path = require("node:path");
const { describe, it } = require("node:test");

const {
  buildPrivacyPreferencesUrl,
  buildRevocationDedupeKey,
  buildRevocationEmailContent,
  diffPreferenceChanges,
  diffRevokedDecisions,
  emailDomainHint,
  escapeHtml,
  hasRevocationMailKey,
  nameRevokedItems,
  normalizeEmail,
  preserveSubjectMetadata,
  readSubjectIdentity,
  withRevocationMailOutcome,
  withSubjectIdentity,
} = require("../../../.tmp/revocation-notification/revocation-notification-core.js");

describe("consent revocation notification core", () => {
  it("detects purpose and vendor revocations from previously granted decisions", () => {
    const previous = [
      { purposeId: "p-analytics", vendorId: null, granted: true },
      { purposeId: "p-essential", vendorId: null, granted: true },
      { purposeId: null, vendorId: "v-ga", granted: true },
      { purposeId: null, vendorId: "v-ads", granted: false },
    ];
    const next = [
      { purposeId: "p-analytics", vendorId: null, granted: false },
      { purposeId: "p-essential", vendorId: null, granted: true },
      { purposeId: null, vendorId: "v-ga", granted: false },
      { purposeId: null, vendorId: "v-ads", granted: false },
    ];

    assert.deepEqual(diffRevokedDecisions(previous, next), [
      { kind: "purpose", id: "p-analytics" },
      { kind: "vendor", id: "v-ga" },
    ]);
  });

  it("lists multiple revocations from one preference update", () => {
    const previous = [
      { purposeId: "p1", vendorId: null, granted: true },
      { purposeId: "p2", vendorId: null, granted: true },
      { purposeId: null, vendorId: "v1", granted: true },
    ];
    const next = previous.map((row) => ({ ...row, granted: false }));
    const revoked = diffRevokedDecisions(previous, next);
    assert.equal(revoked.length, 3);
    const named = nameRevokedItems(revoked, {
      purposes: { p1: "Analytics", p2: "Marketing" },
      vendors: { v1: "Google Analytics" },
    });
    assert.deepEqual(
      named.map((item) => item.name).sort(),
      ["Analytics", "Google Analytics", "Marketing"],
    );
  });

  it("produces no revocations for initial rejection (no prior grants)", () => {
    assert.deepEqual(
      diffRevokedDecisions([], [
        { purposeId: "p1", vendorId: null, granted: false },
        { purposeId: null, vendorId: "v1", granted: false },
      ]),
      [],
    );
  });

  it("produces no revocations when preferences are unchanged", () => {
    const decisions = [
      { purposeId: "p1", vendorId: null, granted: true },
      { purposeId: null, vendorId: "v1", granted: false },
    ];
    assert.deepEqual(diffRevokedDecisions(decisions, decisions), []);
  });

  it("ignores already-revoked items that remain revoked", () => {
    const previous = [
      { purposeId: "p1", vendorId: null, granted: false },
      { purposeId: "p2", vendorId: null, granted: true },
    ];
    const next = [
      { purposeId: "p1", vendorId: null, granted: false },
      { purposeId: "p2", vendorId: null, granted: false },
    ];
    assert.deepEqual(diffRevokedDecisions(previous, next), [
      { kind: "purpose", id: "p2" },
    ]);
  });

  it("mails for other preference saves including new grants", () => {
    const previous = [
      { purposeId: "p1", vendorId: null, granted: false },
      { purposeId: "p2", vendorId: null, granted: true },
    ];
    const next = [
      { purposeId: "p1", vendorId: null, granted: true },
      { purposeId: "p2", vendorId: null, granted: true },
    ];
    assert.deepEqual(diffPreferenceChanges(previous, next), [
      { kind: "purpose", id: "p1", change: "granted" },
    ]);

    const mixed = diffPreferenceChanges(
      [
        { purposeId: "p1", vendorId: null, granted: true },
        { purposeId: "p2", vendorId: null, granted: false },
      ],
      [
        { purposeId: "p1", vendorId: null, granted: false },
        { purposeId: "p2", vendorId: null, granted: true },
      ],
    );
    assert.deepEqual(mixed, [
      { kind: "purpose", id: "p2", change: "granted" },
      { kind: "purpose", id: "p1", change: "revoked" },
    ]);

    const content = buildRevocationEmailContent({
      websiteName: "Acme",
      revokedAt: new Date("2026-11-03T10:15:00.000Z"),
      items: [
        { kind: "purpose", id: "p1", name: "Analytics", change: "revoked" },
        { kind: "purpose", id: "p2", name: "Marketing", change: "granted" },
      ],
    });
    assert.match(content.text, /Consent withdrawn/);
    assert.match(content.text, /Consent given/);
    assert.match(content.text, /Marketing/);
  });

  it("builds a stable dedupe key so duplicate events are ignored", () => {
    const revoked = [
      { kind: "vendor", id: "v1" },
      { kind: "purpose", id: "p1" },
    ];
    const a = buildRevocationDedupeKey({
      consentId: "cid_1",
      stateVersion: 4,
      revoked,
    });
    const b = buildRevocationDedupeKey({
      consentId: "cid_1",
      stateVersion: 4,
      revoked: [...revoked].reverse(),
    });
    assert.equal(a, b);
    assert.equal(a, "cid_1:v4:revoked:purpose:p1,revoked:vendor:v1");

    let metadata = {};
    metadata = withRevocationMailOutcome(metadata, {
      dedupeKey: a,
      status: "sent",
      claimKey: true,
    });
    assert.equal(hasRevocationMailKey(metadata, a), true);
    assert.equal(hasRevocationMailKey(metadata, "other"), false);
  });

  it("builds transactional plain-text and escaped HTML content", () => {
    const content = buildRevocationEmailContent({
      websiteName: "Acme <Shop>",
      revokedAt: new Date("2026-11-03T10:15:00.000Z"),
      timeZone: "UTC",
      items: [
        { kind: "purpose", id: "p1", name: "Analytics & Tracking" },
        { kind: "vendor", id: "v1", name: "Vendor <X>" },
      ],
      preferencesUrl: "https://www.consentguru.com/privacy-center/consent-preferences?siteKey=sk_test",
      appOrigin: "https://www.consentguru.com",
    });

    assert.equal(
      content.subject,
      "Your consent preferences were updated for Acme <Shop>",
    );
    assert.match(content.text, /Consent withdrawn/);
    assert.match(content.text, /Purpose: Analytics & Tracking \(Consent withdrawn\)/);
    assert.match(content.text, /Vendor: Vendor <X> \(Consent withdrawn\)/);
    assert.match(content.text, /does not by itself confirm that historical data was deleted/);
    assert.match(content.text, /Review or change your choices/);
    assert.match(content.html, /Analytics &amp; Tracking/);
    assert.match(content.html, /Vendor &lt;X&gt;/);
    assert.match(content.html, /Acme &lt;Shop&gt;/);
    assert.match(content.html, /consent-guru-logo\.jpg/);
    assert.match(content.html, /Manage privacy preferences/);
    assert.match(content.html, /Consent withdrawn/);
    assert.equal(escapeHtml(`a<"b">`), "a&lt;&quot;b&quot;&gt;");
  });

  it("only trusts subject email from verified metadata or API binding shape", () => {
    assert.equal(normalizeEmail(" User@Example.COM "), "user@example.com");
    assert.equal(normalizeEmail("not-an-email"), null);
    assert.equal(readSubjectIdentity({ email: "user@example.com" }), null);
    assert.equal(
      readSubjectIdentity({
        subject: { email: "user@example.com", verifiedAt: "2026-01-01T00:00:00.000Z" },
      }),
      null,
    );

    const identity = readSubjectIdentity(
      withSubjectIdentity({}, {
        email: "user@example.com",
        verifiedAt: "2026-01-01T00:00:00.000Z",
        source: "api_key",
      }),
    );
    assert.deepEqual(identity, {
      email: "user@example.com",
      verifiedAt: "2026-01-01T00:00:00.000Z",
      source: "api_key",
    });
    assert.equal(
      readSubjectIdentity(
        withSubjectIdentity({}, {
          email: "user@example.com",
          verifiedAt: "2026-01-01T00:00:00.000Z",
          source: "clerk_session",
        }),
      )?.source,
      "clerk_session",
    );
    assert.equal(emailDomainHint("user@example.com"), "***@example.com");
  });

  it("preserves tenant subject binding when evidence metadata is rewritten", () => {
    const previous = withSubjectIdentity({ noticeTitle: "old" }, {
      email: "user@example.com",
      verifiedAt: "2026-01-01T00:00:00.000Z",
      source: "api_key",
    });
    const next = preserveSubjectMetadata({ noticeTitle: "new", choice: "granular" }, previous);
    assert.equal(next.noticeTitle, "new");
    assert.deepEqual(readSubjectIdentity(next), readSubjectIdentity(previous));
  });

  it("builds a privacy preferences link when origin and siteKey exist", () => {
    assert.equal(
      buildPrivacyPreferencesUrl({
        appOrigin: "https://www.consentguru.com",
        siteKey: "sk_live_abc",
      }),
      "https://www.consentguru.com/privacy-center/consent-preferences?siteKey=sk_live_abc",
    );
    assert.equal(
      buildPrivacyPreferencesUrl({ appOrigin: "", siteKey: "sk" }),
      null,
    );
  });

  it("records skipped notification outcomes without storing full email addresses", () => {
    const metadata = withRevocationMailOutcome({}, {
      dedupeKey: "cid:v2:purpose:p1",
      status: "skipped",
      reason: "missing_trusted_email",
      claimKey: true,
    });
    assert.equal(metadata.revocationMail.lastOutcome.status, "skipped");
    assert.equal(metadata.revocationMail.lastOutcome.reason, "missing_trusted_email");
    assert.equal(
      JSON.stringify(metadata).toLowerCase().includes("@"),
      false,
    );
  });
});

describe("consent revocation route wiring", () => {
  const root = path.resolve(__dirname, "../../..");
  const fs = require("node:fs");

  it("schedules revocation mail only after successful consent commit paths", () => {
    const recordRoute = fs.readFileSync(
      path.join(root, "src/app/api/consent/record/route.ts"),
      "utf8",
    );
    const withdrawRoute = fs.readFileSync(
      path.join(root, "src/app/api/consent/withdraw/route.ts"),
      "utf8",
    );
    assert.match(recordRoute, /notifyConsentRevocations/);
    assert.match(recordRoute, /if \(!isNew\)/);
    assert.match(recordRoute, /preserveSubjectMetadata/);
    assert.match(recordRoute, /priorDecisions/);
    assert.match(withdrawRoute, /notifyConsentRevocations/);
    assert.match(withdrawRoute, /fullWithdrawal:\s*true/);
    assert.match(withdrawRoute, /loadDecisionSnapshots/);
  });

  it("exposes a server-side subject session API gated by API key scope", () => {
    const subjectRoute = fs.readFileSync(
      path.join(root, "src/app/api/v1/consent/subject/route.ts"),
      "utf8",
    );
    const logoutRoute = fs.readFileSync(
      path.join(root, "src/app/api/v1/consent/subject/logout/route.ts"),
      "utf8",
    );
    const scopes = fs.readFileSync(
      path.join(root, "src/lib/api-key-auth-logic.ts"),
      "utf8",
    );
    assert.match(subjectRoute, /authenticateApiKey\(request, "consent:subject"\)/);
    assert.match(subjectRoute, /subjectKey/);
    assert.match(subjectRoute, /subjectSessionToken/);
    assert.match(subjectRoute, /normalizeEmail/);
    assert.doesNotMatch(subjectRoute, /body\.userId/);
    assert.match(logoutRoute, /revokeSubjectSessionToken|revokeSubjectSessionsForSubject/);
    assert.match(scopes, /consent:subject/);
  });

  it("routes account preference mail to consent_subjects email without rewriting guest ownership", () => {
    const accountRoute = fs.readFileSync(
      path.join(root, "src/app/api/consent/account/route.ts"),
      "utf8",
    );
    const recordRoute = fs.readFileSync(
      path.join(root, "src/app/api/consent/record/route.ts"),
      "utf8",
    );
    const bindHelper = fs.readFileSync(
      path.join(root, "src/lib/consent/bind-subject-from-session.ts"),
      "utf8",
    );
    assert.match(accountRoute, /notifyAccountPreferenceChanges/);
    assert.match(recordRoute, /do not rewrite guest metadata\.subject/);
    assert.match(bindHelper, /ownership_moved_to_subject_session/);
    assert.doesNotMatch(bindHelper, /consentRecords/);
  });

  it("uses Nodemailer with environment SMTP credentials only", () => {
    const mail = fs.readFileSync(
      path.join(root, "src/lib/mail/send-email.ts"),
      "utf8",
    );
    const revocationMail = fs.readFileSync(
      path.join(root, "src/lib/mail/send-consent-revocation.ts"),
      "utf8",
    );
    assert.match(mail, /CONSENT_SMTP_HOST/);
    assert.match(mail, /CONSENT_SMTP_USER/);
    assert.match(mail, /CONSENT_SMTP_PASS/);
    assert.doesNotMatch(mail, /torsecure\.dev@gmail\.com/);
    assert.match(revocationMail, /sendWithNodemailer/);
  });
});
