const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../../..");
const compiledCandidates = [
  path.join(root, ".tmp/preference-sync/preference-sync-core.js"),
  path.join(root, ".tmp/preference-sync/src/lib/webhooks/preference-sync-core.js"),
  path.join(root, ".tmp/preference-sync/lib/webhooks/preference-sync-core.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled preference-sync-core.js not found. Run npm test (scripts/run-tests.cjs compiles it).",
  );
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "@/lib/consent/revocation-notification-core") {
    return require(path.join(root, ".tmp/revocation-notification/revocation-notification-core.js"));
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  buildPreferenceSyncEnvelope,
  formatPreferenceSyncOwnerSummary,
  PREFERENCE_SYNC_EVENT_TYPE,
} = require(compiledPath);

const names = {
  purposes: {
    "p-analytics": "Analytics",
    "p-marketing": "Marketing",
  },
  vendors: {
    "v-ga": "Google Analytics",
  },
};

describe("preference sync core", () => {
  it("emits established on first save with empty changes", () => {
    const next = [
      { purposeId: "p-analytics", vendorId: null, granted: true },
      { purposeId: "p-marketing", vendorId: null, granted: false },
    ];
    const result = buildPreferenceSyncEnvelope({
      organizationId: "org-1",
      siteId: "site-1",
      subjectKey: "user_abc",
      preferenceRevision: 1,
      previous: [],
      next,
      names,
      eventId: "evt-1",
      hadPreviousRecord: false,
      occurredAt: new Date("2026-01-15T12:00:00.000Z"),
    });

    assert.equal(result.shouldEmit, true);
    assert.equal(result.envelope.type, PREFERENCE_SYNC_EVENT_TYPE);
    assert.equal(result.envelope.data.changeKind, "established");
    assert.equal(result.envelope.data.preferenceRevision, 1);
    assert.deepEqual(result.envelope.data.changes, []);
    assert.equal(result.envelope.data.preferences.length, 2);
    assert.match(
      formatPreferenceSyncOwnerSummary({
        subjectKey: "user_abc",
        changes: result.envelope.data.changes,
      }),
      /established privacy preferences/,
    );
  });

  it("emits updated with multi-change diff", () => {
    const previous = [
      { purposeId: "p-analytics", vendorId: null, granted: false },
      { purposeId: "p-marketing", vendorId: null, granted: true },
      { purposeId: null, vendorId: "v-ga", granted: true },
    ];
    const next = [
      { purposeId: "p-analytics", vendorId: null, granted: true },
      { purposeId: "p-marketing", vendorId: null, granted: false },
      { purposeId: null, vendorId: "v-ga", granted: true },
    ];
    const result = buildPreferenceSyncEnvelope({
      organizationId: "org-1",
      siteId: "site-1",
      subjectKey: "user_abc",
      preferenceRevision: 3,
      previous,
      next,
      names,
      eventId: "evt-2",
      hadPreviousRecord: true,
      occurredAt: new Date("2026-01-15T12:00:00.000Z"),
    });

    assert.equal(result.shouldEmit, true);
    assert.equal(result.envelope.data.changeKind, "updated");
    assert.deepEqual(result.envelope.data.changes, [
      {
        kind: "purpose",
        id: "p-analytics",
        name: "Analytics",
        previousGranted: false,
        currentGranted: true,
      },
      {
        kind: "purpose",
        id: "p-marketing",
        name: "Marketing",
        previousGranted: true,
        currentGranted: false,
      },
    ]);
    assert.equal(
      formatPreferenceSyncOwnerSummary({
        subjectKey: "user_abc",
        changes: result.envelope.data.changes,
      }),
      "User user_abc changed Analytics from Off to On and Marketing from On to Off.",
    );
  });

  it("skips identical preference saves", () => {
    const rows = [
      { purposeId: "p-analytics", vendorId: null, granted: true },
      { purposeId: "p-marketing", vendorId: null, granted: false },
    ];
    const result = buildPreferenceSyncEnvelope({
      organizationId: "org-1",
      siteId: "site-1",
      subjectKey: "user_abc",
      preferenceRevision: 4,
      previous: rows,
      next: rows,
      names,
      eventId: "evt-3",
      hadPreviousRecord: true,
    });
    assert.deepEqual(result, { shouldEmit: false, reason: "identical" });
  });

  it("emits withdrawal as denied updates", () => {
    const previous = [
      { purposeId: "p-analytics", vendorId: null, granted: true },
      { purposeId: "p-marketing", vendorId: null, granted: true },
    ];
    const result = buildPreferenceSyncEnvelope({
      organizationId: "org-1",
      siteId: "site-1",
      subjectKey: "user_abc",
      preferenceRevision: 5,
      previous,
      next: previous.map((row) => ({ ...row, granted: false })),
      names,
      fullWithdrawal: true,
      eventId: "evt-4",
      hadPreviousRecord: true,
      occurredAt: new Date("2026-01-15T12:00:00.000Z"),
    });

    assert.equal(result.shouldEmit, true);
    assert.equal(result.envelope.data.changeKind, "updated");
    assert.ok(result.envelope.data.preferences.every((row) => row.granted === false));
    assert.equal(result.envelope.data.changes.length, 2);
    assert.ok(result.envelope.data.changes.every((change) => change.currentGranted === false));
  });

  it("wires account route as sibling side effect to preference mail", () => {
    const accountRoute = fs.readFileSync(
      path.join(root, "src/app/api/consent/account/route.ts"),
      "utf8",
    );
    assert.match(accountRoute, /notifyAccountPreferenceChanges/);
    assert.match(accountRoute, /enqueuePreferenceSync/);
    assert.match(accountRoute, /sibling side effects/);
  });
});
