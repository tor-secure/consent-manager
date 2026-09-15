const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");

const compiled = [
  path.join(__dirname, "../../../.tmp/compiled/src/lib/billing/stripe.js"),
  path.join(__dirname, "../../../.tmp/billing/stripe.js"),
].find((candidate) => fs.existsSync(candidate));
if (!compiled) throw new Error("stripe.js was not compiled");
const { verifyStripeSignature, stripePriceId, planKeyForStripePrice } = require(compiled);

function sign(payload, secret, timestamp) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

{
  const payload = '{"id":"evt_test"}';
  const secret = "whsec_test_secret";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const header = `t=${timestamp},v1=${sign(payload, secret, timestamp)}`;
  assert.equal(verifyStripeSignature({ payload, header, secret }), true);
  assert.equal(verifyStripeSignature({ payload, header: `t=${timestamp},v1=deadbeef`, secret }), false);
  assert.equal(verifyStripeSignature({ payload, header: null, secret }), false);
}

{
  const previousMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_month";
  assert.equal(stripePriceId("pro", "monthly"), "price_pro_month");
  assert.equal(stripePriceId("starter", "monthly"), null);
  assert.deepEqual(planKeyForStripePrice("price_pro_month"), { planKey: "pro", interval: "monthly" });
  if (previousMonthly === undefined) delete process.env.STRIPE_PRICE_PRO_MONTHLY;
  else process.env.STRIPE_PRICE_PRO_MONTHLY = previousMonthly;
}

console.log("stripe billing signature tests passed");
