const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

assert.equal(exists("src/app/dashboard/loading.tsx"), true);
assert.equal(exists("src/app/dashboard/websites/loading.tsx"), true);
assert.equal(exists("src/app/dashboard/websites/[id]/loading.tsx"), true);
assert.equal(exists("src/app/dashboard/websites/[id]/settings/loading.tsx"), true);
assert.equal(exists("src/app/dashboard/websites/[id]/enforcement/loading.tsx"), true);
assert.equal(exists("src/app/dashboard/websites/[id]/installation/loading.tsx"), true);
assert.equal(exists("src/components/feedback/app-toaster.tsx"), true);
assert.equal(exists("src/lib/tenant-website.ts"), true);

const detailPage = fs.readFileSync(path.join(root, "src/app/dashboard/websites/[id]/page.tsx"), "utf8");
assert.match(detailPage, /Suspense/);
assert.match(detailPage, /requireTenantWebsite/);
assert.doesNotMatch(detailPage, /from\("trackers"\)/);

const websiteForm = fs.readFileSync(path.join(root, "src/components/websites/create-website-form.tsx"), "utf8");
assert.match(websiteForm, /useAsyncAction/);
assert.match(websiteForm, /Adding website/);
assert.match(websiteForm, /Website added successfully/);
assert.match(websiteForm, /loading=\{pending\}/);
assert.match(websiteForm, /FormCard/);
assert.match(fs.readFileSync(path.join(root, "src/app/dashboard/page.tsx"), "utf8"), /requireDashboardContext/);

const button = fs.readFileSync(path.join(root, "src/components/ui/button.tsx"), "utf8");
assert.match(button, /aria-busy=\{loading/);
assert.match(button, /disabled=\{isDisabled\}/);

console.log("dashboard-ux.test.cjs passed");
