import { earlyBlockBootstrapSource } from "@/lib/sdk/early-block";
import { buildEmbedSnippet } from "@/lib/sdk/cmp-sdk-script";

export type InstallStackSnippets = {
  html: string;
  react: string;
  nextjs: string;
  php: string;
  dotnet: string;
};

function stripScriptWrapper(source: string): string {
  return source.replace(/^\s*<script[^>]*>/i, "").replace(/<\/script>\s*$/i, "").trim();
}

function indent(block: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return block
    .split("\n")
    .map((line) => (line.trim().length ? pad + line : line))
    .join("\n");
}

function configPrefetchSource(siteKey: string, apiOrigin: string): string {
  const key = JSON.stringify(siteKey);
  const base = JSON.stringify(apiOrigin);
  return `(function(){
  var key = ${key};
  var base = ${base};
  var lang = "";
  try {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var declared = scripts[i].getAttribute("data-lang");
      if (declared) { lang = declared; break; }
    }
  } catch (e) {}
  try { if (!lang && window.__CMP_LANG) lang = window.__CMP_LANG; } catch (e) {}
  try { if (!lang && location.search) lang = new URLSearchParams(location.search).get("lang") || ""; } catch (e) {}
  try { if (!lang) lang = navigator.language || (navigator.languages && navigator.languages[0]) || ""; } catch (e) {}
  var url = base + "/api/sdk/" + encodeURIComponent(key) + "/config";
  var qs = [];
  if (lang) qs.push("lang=" + encodeURIComponent(String(lang).slice(0, 35)));
  try {
    var geo = window.__CMP_GEO;
    if (geo && geo.country) qs.push("country=" + encodeURIComponent(String(geo.country).slice(0, 8)));
    if (geo && geo.region) qs.push("region=" + encodeURIComponent(String(geo.region).slice(0, 16)));
  } catch (e) {}
  if (qs.length) url += "?" + qs.join("&");
  window.__CMP_CONFIG_URL = url;
  window.__CMP_CONFIG_PROMISE = fetch(url, { cache: "no-cache", mode: "cors", headers: { "Cache-Control": "no-cache" } }).then(function(r) {
    if (r.status === 304) return { success: true, unchanged: true };
    return r.json();
  });
})();`;
}

/**
 * Ready-to-paste snippets per tech stack.
 * HTML is the canonical embed. React / Next.js wrap that same install correctly for each runtime.
 */
export function buildInstallStackSnippets(options: {
  siteKey: string;
  cdnUrl: string;
}): InstallStackSnippets {
  const html = buildEmbedSnippet(options);
  let apiOrigin = "";
  try {
    apiOrigin = new URL(options.cdnUrl).origin;
  } catch {
    apiOrigin = "";
  }

  const react = `<!-- public/index.html — put Consent Guru first in <head>, before analytics. -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your app</title>
${indent(html, 4)}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  const earlyBlock = stripScriptWrapper(earlyBlockBootstrapSource());
  const prefetch = configPrefetchSource(options.siteKey, apiOrigin);

  const nextjs = `// app/layout.tsx
import type { ReactNode } from "react";

const CMP_SITE_KEY = ${JSON.stringify(options.siteKey)};
const CMP_SDK_SRC = ${JSON.stringify(options.cdnUrl)};
const CMP_API_BASE = ${JSON.stringify(apiOrigin)};
const CMP_EARLY_BLOCK = ${JSON.stringify(earlyBlock)};
const CMP_CONFIG_PREFETCH = ${JSON.stringify(prefetch)};

/**
 * Keep Consent Guru first in <head>.
 * Do not load it from useEffect or next/script alone — the early-block bootstrap must run first.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {CMP_API_BASE ? (
          <>
            <link rel="preconnect" href={CMP_API_BASE} crossOrigin="" />
            <link rel="dns-prefetch" href={CMP_API_BASE} />
          </>
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: CMP_EARLY_BLOCK }} />
        <script dangerouslySetInnerHTML={{ __html: CMP_CONFIG_PREFETCH }} />
        <script src={CMP_SDK_SRC} data-site-key={CMP_SITE_KEY} />
      </head>
      <body>{children}</body>
    </html>
  );
}
`;

  const php = `<?php
// partials/cmp-install.php
// Include first inside <head> on every page:
// <?php require __DIR__ . '/partials/cmp-install.php'; ?>
?>
${html}
`;

  const dotnet = `@* Views/Shared/_CmpInstall.cshtml *@
@* In _Layout.cshtml, render first inside <head>: *@
@* @await Html.PartialAsync("_CmpInstall") *@
${html}
`;

  return { html, react, nextjs, php, dotnet };
}
