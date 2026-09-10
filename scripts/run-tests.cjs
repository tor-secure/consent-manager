const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const tempRoot = path.join(root, ".tmp");
const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function compile(outDir, sources, extraArgs = []) {
  const configPath = path.join(tempRoot, `tsconfig.${outDir}.json`);
  const rootDirIndex = extraArgs.indexOf("--rootDir");
  const rootDir = rootDirIndex >= 0
    ? path.resolve(root, extraArgs[rootDirIndex + 1])
    : path.dirname(path.resolve(root, sources[0]));
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      extends: path.join(root, "tsconfig.json"),
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        moduleResolution: "node",
        noEmit: false,
        incremental: false,
        outDir: path.join(tempRoot, outDir),
        rootDir,
      },
      files: sources.map((source) => path.join(root, source)),
    }),
  );
  run(process.execPath, [tsc, "-p", configPath]);
}

function collectTests(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(entryPath);
    return entry.name.endsWith(".test.cjs") ? [entryPath] : [];
  });
}

function copyCompiled(source, destination) {
  const target = path.join(tempRoot, destination);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(tempRoot, "compiled", source), target);
}

fs.rmSync(tempRoot, { recursive: true, force: true });

run(process.execPath, [tsc, "-p", "tsconfig.tests.json"]);
compile(
  "compiled",
  [
    "src/lib/dashboard-feedback.ts",
    "src/lib/dashboard-search.ts",
    "src/lib/logger.ts",
    "src/lib/health.ts",
    "src/lib/monitoring/drift-engine.ts",
    "src/lib/security-headers.ts",
    "src/lib/scanner/ssrf-guard.ts",
    "src/lib/scanner/tracker-signatures.ts",
    "src/lib/scanner/html-analyser.ts",
    "src/lib/rate-limit.ts",
    "src/lib/api-key-auth-logic.ts",
    "src/lib/consent-evaluation-core.ts",
    "src/lib/policy-context.ts",
    "src/lib/portable-consent-proof.ts",
    "src/lib/portable-consent-core.ts",
    "src/lib/redaction-core.ts",
    "src/lib/sdk/cmp-sdk-script.ts",
    "src/lib/sdk/enforcement.ts",
    "src/lib/sdk/public-http.ts",
    "src/lib/ccpa/types.ts",
    "src/lib/ccpa/gpc.ts",
    "src/lib/ccpa/state.ts",
    "src/lib/ccpa/enforcement.ts",
    "src/lib/ccpa/validate.ts",
    "src/lib/trackers/management.ts",
    "src/lib/retention/core.ts",
    "src/lib/privacy-rights/types.ts",
    "src/lib/privacy-rights/applicability.ts",
    "src/lib/privacy-rights/deadlines.ts",
    "src/lib/privacy-rights/lifecycle.ts",
    "src/lib/privacy-rights/tokens.ts",
    "src/lib/privacy-rights/deletion-policy.ts",
    "src/lib/privacy-rights/correction-policy.ts",
    "src/lib/privacy-rights/export-sanitize.ts",
    "src/lib/privacy-rights/public-status.ts",
    "src/lib/compliance/types.ts",
    "src/lib/compliance/rule-registry.ts",
    "src/lib/compliance/evaluate.ts",
    "src/lib/children/types.ts",
    "src/lib/children/config.ts",
    "src/lib/children/state.ts",
    "src/lib/children/evaluate.ts",
    "src/lib/children/context.ts",
    "src/lib/processing/types.ts",
    "src/lib/processing/regions.ts",
    "src/lib/processing/snapshot.ts",
    "src/lib/processing/validate.ts",
    "src/lib/webhooks/delivery.ts",
  ],
  ["--rootDir", "."],
);

copyCompiled("src/lib/dashboard-feedback.js", "dashboard-feedback/dashboard-feedback.js");
copyCompiled("src/lib/dashboard-search.js", "dashboard-search/dashboard-search.js");
copyCompiled("src/lib/logger.js", "logger/logger.js");
copyCompiled("src/lib/health.js", "health/health.js");
copyCompiled("src/lib/monitoring/drift-engine.js", "drift-engine/drift-engine.js");
copyCompiled("src/lib/security-headers.js", "security-headers/security-headers.js");
copyCompiled("src/lib/scanner/ssrf-guard.js", "scanner-security/ssrf-guard.js");
copyCompiled("src/lib/scanner/tracker-signatures.js", "scanner-security/tracker-signatures.js");
copyCompiled("src/lib/scanner/html-analyser.js", "scanner-security/html-analyser.js");
copyCompiled("src/lib/rate-limit.js", "rate-limit/rate-limit.js");
copyCompiled("src/lib/api-key-auth-logic.js", "enforcement/api-key-auth-logic.js");
copyCompiled("src/lib/consent-evaluation-core.js", "enforcement/consent-evaluation-core.js");
copyCompiled("src/lib/policy-context.js", "policy-context/policy-context.js");
copyCompiled("src/lib/portable-consent-proof.js", "portable-redaction/portable-consent-proof.js");
copyCompiled("src/lib/portable-consent-core.js", "portable-redaction/portable-consent-core.js");
copyCompiled("src/lib/redaction-core.js", "portable-redaction/redaction-core.js");
copyCompiled("src/lib/webhooks/delivery.js", "webhook-delivery/delivery.js");
copyCompiled("src/lib/trackers/management.js", "tracker-management/trackers/management.js");
copyCompiled("src/lib/ccpa/types.js", "tracker-management/ccpa/types.js");
copyCompiled("src/lib/retention/core.js", "retention/retention/core.js");
for (const file of [
  "types",
  "applicability",
  "deadlines",
  "lifecycle",
  "tokens",
  "deletion-policy",
  "correction-policy",
  "export-sanitize",
  "public-status",
]) {
  copyCompiled(`src/lib/privacy-rights/${file}.js`, `privacy-rights/${file}.js`);
}
for (const file of ["types", "gpc", "state", "enforcement", "validate"]) {
  copyCompiled(`src/lib/ccpa/${file}.js`, `ccpa/${file}.js`);
}
for (const file of ["types", "rule-registry", "evaluate"]) {
  copyCompiled(`src/lib/compliance/${file}.js`, `compliance/${file}.js`);
}
for (const file of ["types", "config", "state", "evaluate", "context"]) {
  copyCompiled(`src/lib/children/${file}.js`, `children/${file}.js`);
}
for (const file of ["types", "regions", "snapshot", "validate"]) {
  copyCompiled(`src/lib/processing/${file}.js`, `processing/${file}.js`);
}
fs.cpSync(
  path.join(tempRoot, "compiled", "src", "lib"),
  path.join(tempRoot, "consent-manager-e2e", "src", "lib"),
  { recursive: true },
);

const testFiles = collectTests(path.join(root, "src")).sort();
for (const testFile of testFiles) {
  run(process.execPath, ["--test", testFile]);
}
