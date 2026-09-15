const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const compiled = [
  path.join(__dirname, "../../../.tmp/compiled/src/lib/intelligence/twin-restore.js"),
  path.join(__dirname, "../../../.tmp/twin-restore/twin-restore.js"),
].find((candidate) => fs.existsSync(candidate));
if (!compiled) throw new Error("twin-restore.js was not compiled");
const { trackersFromTwinPayload } = require(compiled);

assert.deepEqual(trackersFromTwinPayload(null), []);
assert.deepEqual(
  trackersFromTwinPayload({
    graph: {
      trackers: [
        { id: "t1", purposeId: "p1", vendorId: null, status: "active", isEssential: false },
      ],
    },
  }),
  [{ id: "t1", purposeId: "p1", vendorId: null, status: "active", isEssential: false }],
);

console.log("digital twin restore parser tests passed");
