const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

const {
  buildMergeItems,
  denyWinsGrant,
  guestChoiceIsFullAccept,
  guestChoiceIsFullReject,
} = require("../../../.tmp/account-consent-merge/account-consent-merge-core.js");

describe("account consent merge core", () => {
  it("applies deny-wins across guest and account grants", () => {
    assert.equal(denyWinsGrant(true, true), true);
    assert.equal(denyWinsGrant(true, false), false);
    assert.equal(denyWinsGrant(false, true), false);
    assert.equal(denyWinsGrant(null, true), true);
    assert.equal(denyWinsGrant(true, null), true);
    assert.equal(denyWinsGrant(null, null), false);
  });

  it("marks conflicts when browser and account disagree", () => {
    const items = buildMergeItems({
      purposes: [
        { id: "p-analytics", name: "Analytics", isRequired: false },
        { id: "p-essential", name: "Essential", isRequired: true },
      ],
      vendors: [{ id: "v-ga", name: "GA" }],
      guestPurposes: { "p-analytics": true },
      guestVendors: { "v-ga": false },
      accountPurposes: { "p-analytics": false },
      accountVendors: { "v-ga": true },
      hasGuestSnapshot: true,
      hasAccountSnapshot: true,
    });

    assert.equal(items.length, 2);
    const analytics = items.find((row) => row.id === "p-analytics");
    const vendor = items.find((row) => row.id === "v-ga");
    assert.equal(analytics.conflict, true);
    assert.equal(analytics.effectiveGranted, false);
    assert.equal(vendor.conflict, true);
    assert.equal(vendor.effectiveGranted, false);
  });

  it("detects full guest reject vs accept for merge prompts", () => {
    const rejected = buildMergeItems({
      purposes: [{ id: "p1", name: "Analytics" }],
      guestPurposes: { p1: false },
      guestVendors: {},
      accountPurposes: {},
      accountVendors: {},
      hasGuestSnapshot: true,
      hasAccountSnapshot: false,
    });
    const accepted = buildMergeItems({
      purposes: [{ id: "p1", name: "Analytics" }],
      guestPurposes: { p1: true },
      guestVendors: {},
      accountPurposes: {},
      accountVendors: {},
      hasGuestSnapshot: true,
      hasAccountSnapshot: false,
    });
    assert.equal(guestChoiceIsFullReject(rejected), true);
    assert.equal(guestChoiceIsFullAccept(accepted), true);
    assert.equal(guestChoiceIsFullReject(accepted), false);
  });

  it("does not treat missing guest snapshot as a local reject", () => {
    const items = buildMergeItems({
      purposes: [{ id: "p1", name: "Analytics" }],
      guestPurposes: {},
      guestVendors: {},
      accountPurposes: { p1: true },
      accountVendors: {},
      hasGuestSnapshot: false,
      hasAccountSnapshot: true,
    });
    assert.equal(items[0].guestGranted, null);
    assert.equal(items[0].effectiveGranted, true);
    assert.equal(items[0].conflict, false);
  });
});
