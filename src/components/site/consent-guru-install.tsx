import Script from "next/script";
import { earlyBlockBootstrapSource } from "@/lib/sdk/early-block";

/** Public install credentials for the ConsentGuru marketing site. */
export const CONSENT_GURU_SITE_KEY =
  "site_e3c370ebf04a1ba38b238f8c8cd6a302f176db55b463e6db";
export const CONSENT_GURU_SITE_VERIFICATION = "b5b1db72c2d9b326d0c1221c8547fe1c";
export const CONSENT_GURU_ORIGIN = "https://www.consentguru.com";
export const CONSENT_GURU_SDK_SRC = `${CONSENT_GURU_ORIGIN}/api/sdk/script`;

function scriptBody(snippet: string): string {
  return snippet.replace(/^\s*<script>\s*/i, "").replace(/\s*<\/script>\s*$/i, "");
}

function configPrefetchSource(): string {
  const key = JSON.stringify(CONSENT_GURU_SITE_KEY);
  const base = JSON.stringify(CONSENT_GURU_ORIGIN);
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
  window.__CMP_CONFIG_PROMISE = fetch(url, { cache: "no-store", mode: "cors", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }).then(function(r) {
    if (r.status === 304) return { success: true, unchanged: true };
    return r.json();
  });
})();`;
}

/**
 * The install block customers paste into <head>. beforeInteractive keeps these
 * synchronous and ahead of the rest of the app scripts.
 */
export function ConsentGuruInstall({ nonce }: { nonce?: string }) {
  return (
    <>
      <Script
        id="cmp-early-block"
        strategy="beforeInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: scriptBody(earlyBlockBootstrapSource()) }}
      />
      <Script
        id="cmp-config-prefetch"
        strategy="beforeInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: configPrefetchSource() }}
      />
      <Script
        id="cmp-sdk"
        src={CONSENT_GURU_SDK_SRC}
        strategy="beforeInteractive"
        nonce={nonce}
        data-site-key={CONSENT_GURU_SITE_KEY}
      />
    </>
  );
}
