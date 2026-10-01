const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const { BROWSER_CRAWL_CHROMIUM_ARGS, normalizeCrawlUrl, isSameCrawlSite, robotsAllows, browserCrawlConfigSchema, crawlerEgressGuardEnabled, crawlerSafeRequestHeaders, crawlerSafeProxyHeaders } = require("../../../.tmp/browser-crawler/browser-crawl-core.js");
const { pickPublicAddress } = require("../../../.tmp/browser-crawler/safe-browser-proxy-core.js");
assert.equal(normalizeCrawlUrl("https://WWW.Example.com/a/?secret=x#test"), "https://example.com/a");
assert.equal(normalizeCrawlUrl("javascript:alert(1)"), null);
assert.equal(isSameCrawlSite("https://www.example.com/docs", "https://example.com/"), true);
assert.equal(isSameCrawlSite("https://evil.example.com", "https://example.com"), false);
assert.equal(robotsAllows("User-agent: *\nDisallow: /private", "/private/a"), false);
assert.equal(robotsAllows("User-agent: *\nDisallow: /private", "/public"), true);
assert.equal(crawlerEgressGuardEnabled(undefined), false);
assert.equal(crawlerEgressGuardEnabled("false"), false);
assert.equal(crawlerEgressGuardEnabled("true"), true);
assert.deepEqual(crawlerSafeRequestHeaders({ Authorization: "secret", Cookie: "session=secret", "X-Api-Key": "secret", "X-Session-Token": "secret", "X-Password-Hint": "secret", Accept: "text/html" }), { Accept: "text/html" });
assert.deepEqual(crawlerSafeProxyHeaders({ authorization: "secret", cookie: "session=secret", "x-session-token": "secret", accept: "text/html", "sec-websocket-key": "public" }), { accept: "text/html", "sec-websocket-key": "public" });
assert.ok(BROWSER_CRAWL_CHROMIUM_ARGS.some((arg) => arg.includes("host-resolver-rules=MAP * ~NOTFOUND")));
assert.ok(BROWSER_CRAWL_CHROMIUM_ARGS.some((arg) => arg.includes("disable_non_proxied_udp")));
assert.deepEqual(pickPublicAddress([{ address: "8.8.8.8", family: 4 }]), { address: "8.8.8.8", family: 4 });
assert.deepEqual(pickPublicAddress([{ address: "2606:4700:4700::1111", family: 6 }, { address: "8.8.8.8", family: 4 }]), { address: "8.8.8.8", family: 4 });
assert.equal(pickPublicAddress([{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]), null);
assert.equal(pickPublicAddress([{ address: "169.254.169.254", family: 4 }]), null);
assert.equal(browserCrawlConfigSchema.safeParse({ maxPages: 101 }).success, false);
console.log("Browser crawler utility tests passed");

const originalLoad = Module._load;
Module._load = function loadWithoutServerOnly(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
const { fetchPublicText, startSafeBrowserProxy } = require("../../../.tmp/browser-crawler/safe-browser-proxy.js");

(async () => {
  const proxy = await startSafeBrowserProxy();
  const response = await new Promise((resolve, reject) => {
    const request = http.request({ hostname: "127.0.0.1", port: Number(new URL(proxy.url).port), path: "http://127.0.0.1/", method: "GET" }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
    request.on("error", reject);
    request.end();
  });
  assert.equal(response, 403);
  assert.equal(await fetchPublicText("http://127.0.0.1/robots.txt", { maxBytes: 1024, timeoutMs: 1000 }), null);
  await proxy.close();
  console.log("Browser proxy rejects loopback destinations");
})().catch((error) => { console.error(error); process.exitCode = 1; });
