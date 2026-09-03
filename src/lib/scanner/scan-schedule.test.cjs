const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
execSync("npx tsc -p tsconfig.tests.json", { cwd: root, stdio: "pipe" });

const compiledCandidates = [
  path.join(root, ".tmp/test-libs/lib/scanner/scan-schedule.js"),
  path.join(root, ".tmp/scan-schedule/scan-schedule.js"),
  path.join(root, ".tmp/scan-schedule/src/lib/scanner/scan-schedule.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));
if (!compiledPath) {
  throw new Error(
    "Compiled scan-schedule.js not found. Run: npx tsc --outDir .tmp/scan-schedule --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/scanner/scan-schedule.ts src/lib/scanner/cron-auth.ts",
  );
}

const cronCandidates = [
  path.join(root, ".tmp/test-libs/lib/scanner/cron-auth.js"),
  path.join(root, ".tmp/scan-schedule/cron-auth.js"),
  path.join(root, ".tmp/scan-schedule/src/lib/scanner/cron-auth.js"),
];
const cronPath = cronCandidates.find((candidate) => fs.existsSync(candidate));

const {
  SCAN_FREQUENCIES,
  canStartScheduledScan,
  computeNextScanAt,
  executeDueScans,
  isScanFrequency,
  isScheduleDue,
  selectDueSchedules,
  shouldNotifyRepeatedScanFailure,
  sanitizeScanError,
} = require(compiledPath);

const { authorizeCronRequest, secretsMatch } = require(cronPath);

const now = new Date("2026-09-03T12:00:00.000Z");

function candidate(overrides = {}) {
  return {
    id: "sched-1",
    organizationId: "org-a",
    websiteId: "site-a",
    enabled: true,
    frequency: "daily",
    nextScanAt: new Date("2026-09-03T11:00:00.000Z"),
    lastScanAt: new Date("2026-09-01T12:00:00.000Z"),
    lockedUntil: null,
    consecutiveFailures: 0,
    websiteStatus: "active",
    websiteDeletedAt: null,
    websiteDomain: "example.com",
    ...overrides,
  };
}

assert.equal(isScanFrequency("hourly"), false);
assert.deepEqual([...SCAN_FREQUENCIES], ["daily", "weekly", "monthly"]);

{
  const daily = computeNextScanAt(now, "daily");
  const weekly = computeNextScanAt(now, "weekly");
  const monthly = computeNextScanAt(now, "monthly");
  assert.equal(daily.toISOString(), "2026-09-04T12:00:00.000Z");
  assert.equal(weekly.toISOString(), "2026-09-10T12:00:00.000Z");
  assert.equal(monthly.toISOString(), "2026-10-03T12:00:00.000Z");
}

assert.equal(isScheduleDue(candidate(), now), true);
assert.equal(isScheduleDue(candidate({ enabled: false }), now), false);
assert.equal(
  isScheduleDue(candidate({ nextScanAt: new Date("2026-09-04T12:00:00.000Z") }), now),
  false,
);
assert.equal(isScheduleDue(candidate({ websiteStatus: "inactive" }), now), false);
assert.equal(isScheduleDue(candidate({ websiteDeletedAt: now }), now), false);

{
  const due = selectDueSchedules(
    [
      candidate({ id: "future", nextScanAt: new Date("2026-09-04T00:00:00.000Z") }),
      candidate({ id: "disabled", enabled: false }),
      candidate({ id: "due-b", websiteId: "site-b", nextScanAt: new Date("2026-09-03T10:00:00.000Z") }),
      candidate({ id: "due-a", nextScanAt: new Date("2026-09-03T09:00:00.000Z") }),
    ],
    now,
    10,
  );
  assert.deepEqual(
    due.map((row) => row.id),
    ["due-a", "due-b"],
  );
}

assert.equal(
  canStartScheduledScan({
    due: true,
    lockHeld: true,
    hasRunningScan: false,
    frequency: "daily",
    lastScanAt: null,
    now,
  }).ok,
  false,
);
assert.equal(
  canStartScheduledScan({
    due: true,
    lockHeld: false,
    hasRunningScan: true,
    frequency: "daily",
    lastScanAt: null,
    now,
  }).reason,
  "running",
);

assert.equal(shouldNotifyRepeatedScanFailure(1), false);
assert.equal(shouldNotifyRepeatedScanFailure(3), true);
assert.equal(shouldNotifyRepeatedScanFailure(4), false);
assert.equal(sanitizeScanError("  boom  ").length <= 500, true);

assert.equal(secretsMatch("same-secret-value", "same-secret-value"), true);
assert.equal(secretsMatch("same-secret-value", "other-secret-valu"), false);

{
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "scheduled-scan-secret-key";
  const ok = authorizeCronRequest(
    new Request("https://cmp.test/api/cron/scans", {
      headers: { authorization: "Bearer scheduled-scan-secret-key" },
    }),
  );
  const denied = authorizeCronRequest(
    new Request("https://cmp.test/api/cron/scans", {
      headers: { authorization: "Bearer wrong-secret-key-here" },
    }),
  );
  assert.equal(ok, true);
  assert.equal(denied, false);
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
}

(async () => {
  const scans = [];
  let claimed = false;
  const summary = await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate()],
    claim: async () => {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async (websiteId, domain, options) => {
      scans.push({ websiteId, domain, options, preservedPrevious: true });
      return { scanId: "scan-new", status: "completed", errorMessage: null };
    },
    recordOutcome: async () => {},
    notifyFailure: async () => {
      throw new Error("should not notify on success");
    },
  });
  assert.equal(summary.started, 1);
  assert.equal(summary.completed, 1);
  assert.equal(scans[0].options.triggeredBy, "scheduled");

  let runCount = 0;
  const duplicate = await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ id: "dup" })],
    claim: async () => false,
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async () => {
      runCount += 1;
      return { scanId: "x", status: "completed", errorMessage: null };
    },
    recordOutcome: async () => {},
    notifyFailure: async () => {},
  });
  assert.equal(duplicate.started, 0);
  assert.equal(runCount, 0);

  let concurrentRuns = 0;
  const concurrent = await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ id: "run" })],
    claim: async () => true,
    hasRunningScan: async () => true,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async () => {
      concurrentRuns += 1;
      return { scanId: "x", status: "completed", errorMessage: null };
    },
    recordOutcome: async () => {},
    notifyFailure: async () => {},
  });
  assert.equal(concurrent.skipped >= 1, true);
  assert.equal(concurrentRuns, 0);

  const previousSuccessful = [{ id: "scan-old", status: "completed", itemsDetected: 4 }];
  const outcomes = [];
  const failed = await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ consecutiveFailures: 2 })],
    claim: async () => true,
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async () => ({
      scanId: "scan-fail",
      status: "failed",
      errorMessage: "timeout",
    }),
    recordOutcome: async (input) => {
      outcomes.push(input);
    },
    notifyFailure: async () => {},
  });
  assert.equal(failed.failed, 1);
  assert.equal(outcomes[0].status, "failed");
  assert.equal(outcomes[0].consecutiveFailures, 3);
  assert.equal(previousSuccessful[0].status, "completed");
  assert.equal(previousSuccessful[0].itemsDetected, 4);

  let ssrfRuns = 0;
  await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ websiteDomain: "127.0.0.1" })],
    claim: async () => true,
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {
      throw new Error("This address cannot be scanned");
    },
    toAbsoluteScanUrl: (domain) => `http://${domain}`,
    runScan: async () => {
      ssrfRuns += 1;
      return { scanId: "nope", status: "completed", errorMessage: null };
    },
    recordOutcome: async () => {},
    notifyFailure: async () => {},
  });
  assert.equal(ssrfRuns, 0);

  const disabled = await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ enabled: false })],
    claim: async () => true,
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async () => {
      throw new Error("should not scan disabled");
    },
    recordOutcome: async () => {},
    notifyFailure: async () => {},
  });
  assert.equal(disabled.started, 0);

  const crossOrg = [];
  await executeDueScans({
    now: () => now,
    listCandidates: async () => [candidate({ organizationId: "org-b", websiteId: "site-b" })],
    claim: async () => true,
    hasRunningScan: async () => false,
    assertSafeScanUrl: async () => {},
    toAbsoluteScanUrl: (domain) => `https://${domain}`,
    runScan: async (websiteId, _domain, _options) => {
      crossOrg.push(websiteId);
      return { scanId: "scan-b", status: "completed", errorMessage: null };
    },
    recordOutcome: async (input) => {
      assert.equal(input.organizationId, "org-b");
      assert.equal(input.websiteId, "site-b");
    },
    notifyFailure: async () => {},
  });
  assert.deepEqual(crossOrg, ["site-b"]);

  const engine = fs.readFileSync(path.join(root, "src/lib/scanner/scan-engine.ts"), "utf8");
  const manual = fs.readFileSync(path.join(root, "src/app/api/scanner/run/route.ts"), "utf8");
  const scheduled = fs.readFileSync(path.join(root, "src/lib/scanner/run-due-scans.ts"), "utf8");
  assert.match(manual, /runScan\(/);
  assert.match(scheduled, /runScan\(/);
  assert.match(engine, /triggeredBy/);
  assert.match(manual, /triggeredBy:\s*"manual"/);
  assert.match(scheduled, /assertSafeScanUrl/);
  assert.doesNotMatch(scheduled, /setInterval/);
  assert.doesNotMatch(engine, /setInterval/);

  console.log("scan schedule tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
