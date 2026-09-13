const assert = require("node:assert/strict");
const {
  htmlHasVerificationMeta,
  verificationFetchHosts,
} = require("../../.tmp/consent-manager-e2e/src/lib/website-domain-verify-constants.js");

assert.equal(
  htmlHasVerificationMeta(
    `<meta name="cmp-site-verification" content="878223c488aa63806f55ae52762f3a01" />`,
    "878223c488aa63806f55ae52762f3a01",
  ),
  true,
);

assert.deepEqual(verificationFetchHosts("consentguru.com"), [
  "consentguru.com",
  "www.consentguru.com",
]);
assert.deepEqual(verificationFetchHosts("www.consentguru.com"), [
  "www.consentguru.com",
  "consentguru.com",
]);

console.log("website-domain-verify helpers passed");
