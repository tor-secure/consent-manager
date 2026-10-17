const assert = require("node:assert/strict");
const path = require("node:path");

const {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  INDEXABLE_ROBOTS,
  NOINDEX_ROBOTS,
  pageAlternates,
  buildPageMetadata,
} = require(path.join(__dirname, "../../.tmp/compiled/src/lib/site-metadata.js"));

assert.equal(SITE_URL, "https://www.consentguru.com");
assert.equal(SITE_NAME, "Consent Guru");
assert.match(DEFAULT_TITLE, /^Consent Guru/);
assert.doesNotMatch(DEFAULT_TITLE, /coming soon/i);
assert.doesNotMatch(DEFAULT_DESCRIPTION, /coming soon/i);
assert.ok(DEFAULT_DESCRIPTION.length > 80);
assert.equal(INDEXABLE_ROBOTS.index, true);
assert.equal(NOINDEX_ROBOTS.index, false);

const home = pageAlternates("/");
assert.equal(home.canonical, "/");
assert.equal(home.languages["en-IN"], "/");
assert.equal(home.languages["x-default"], "/");

const about = buildPageMetadata({
  title: "About",
  description: "About Consent Guru for organizations that need a CMP.",
  path: "/about",
});
assert.equal(about.title, "About");
assert.equal(about.robots.index, true);
assert.equal(about.alternates.canonical, "/about");
assert.equal(about.openGraph.url, "https://www.consentguru.com/about");

console.log("site-metadata.test.cjs: ok");
