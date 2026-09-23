const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

const homeQueries = fs.readFileSync(path.join(root, "src/lib/dashboard/home-queries.ts"), "utf8");
const bundle = fs.readFileSync(path.join(root, "src/lib/analytics/home-bundle.ts"), "utf8");
const schema = fs.readFileSync(path.join(root, "src/db/schema/consent-records.ts"), "utf8");
const events = fs.readFileSync(path.join(root, "src/db/schema/consent-events.ts"), "utf8");
const ensure = fs.readFileSync(path.join(root, "scripts/neon-ensure-schema.sql"), "utf8");

assert.match(homeQueries, /db\.execute\(/);
assert.equal(homeQueries.match(/db\.execute\(/g).length, 2);
assert.match(bundle, /MATERIALIZED/);
assert.match(bundle, /consent_events e/);
assert.doesNotMatch(bundle, /browser/);
assert.match(schema, /consent_records_org_updated_idx/);
assert.match(events, /consent_events_org_occurred_idx/);
assert.match(ensure, /consent_records_org_updated_idx/);
assert.match(ensure, /notifications_org_unread_idx/);
