"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const RECENT_KEYS_STORAGE = "cmp_demo_recent_sitekeys";

type ConsentState = {
  consentId: string | null;
  decisions: Record<string, unknown>;
  websiteId: string | null;
};

type BannerConfig = {
  title?: string;
  description?: string;
  position?: string;
  layout?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  showAcceptAll?: boolean;
  showRejectAll?: boolean;
  showCustomize?: boolean;
  acceptAllLabel?: string;
  rejectAllLabel?: string;
  customizeLabel?: string;
  defaultConsent?: string;
  consentExpireDays?: number;
};

type Purpose = {
  id: string;
  key: string;
  name: string;
  description?: string;
  isRequired?: boolean;
};

type Vendor = {
  id: string;
  name: string;
  domain?: string;
  privacyPolicyUrl?: string;
};

type TrackerRule = {
  id: string;
  name: string;
  type: string;
  domain?: string | null;
  identifier?: string | null;
  purposeId?: string | null;
  vendorId?: string | null;
  isEssential: boolean;
  status: string;
};

type CmpConfig = {
  success: boolean;
  websiteId?: string;
  policy?: { id: string; name: string; version: number; isPublished: boolean } | null;
  bannerConfig?: BannerConfig | null;
  purposes?: Purpose[];
  vendors?: Vendor[];
  trackerRules?: TrackerRule[];
  locale?: { language?: string; region?: string } | null;
  message?: string;
};

function SdkDemoInner() {
  const searchParams = useSearchParams();
  const urlSiteKey = searchParams.get("siteKey")?.trim() || "";
  const [siteKey, setSiteKey] = useState(urlSiteKey || "");
  const [inputKey, setInputKey] = useState(urlSiteKey || "");
  const [consentState, setConsentState] = useState<ConsentState | null>(null);
  const [configResponse, setConfigResponse] = useState<CmpConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const [currentHostname, setCurrentHostname] = useState<string>("localhost");
  const [pageProtocol, setPageProtocol] = useState<string>("http:");

  // --- Client-side hydration-safe origin info ---
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      setCurrentHostname(u.hostname);
      setPageProtocol(u.protocol);
    } catch {
      /* ignore */
    }
  }, []);

  // --- Recent siteKeys persistence (no manual code changes required) ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEYS_STORAGE);
      if (raw) setRecentKeys(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function pushRecentKey(k: string) {
    if (!k) return;
    setRecentKeys((prev) => {
      const next = [k, ...prev.filter((x) => x !== k)].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEYS_STORAGE, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function clearRecentKeys() {
    try {
      localStorage.removeItem(RECENT_KEYS_STORAGE);
    } catch {
      /* ignore */
    }
    setRecentKeys([]);
  }

  function clearCurrentConsentStorage() {
    if (!siteKey) return;
    try {
      localStorage.removeItem("cmp_consent_" + siteKey);
      localStorage.removeItem("cmp_expiry_" + siteKey);
    } catch {
      /* ignore */
    }
    log("Cleared localStorage consent state for " + siteKey);
    setConsentState(null);
    // Trigger SDK to re-render banner by removing it and re-adding the state.
    const cmp = (window as unknown as { CMP?: { showBanner: () => void } }).CMP;
    if (cmp?.showBanner) cmp.showBanner();
  }

  const scriptSrc = useMemo(
    () => (siteKey ? `/api/sdk/script?siteKey=${encodeURIComponent(siteKey)}` : ""),
    [siteKey],
  );

  function log(msg: string) {
    const ts = new Date().toLocaleTimeString();
    setEventLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 30));
  }

  // Fetch the config endpoint directly so we can show a preview of what the SDK
  // will see, independent of the SDK's own fetch.
  useEffect(() => {
    if (!siteKey) {
      setConfigResponse(null);
      setConfigError(null);
      return;
    }
    setConfigLoading(true);
    setConfigError(null);
    fetch(`/api/sdk/${encodeURIComponent(siteKey)}/config`)
      .then((r) => r.json())
      .then((data) => {
        setConfigResponse(data as CmpConfig);
        setConfigLoading(false);
        if (!data.success) {
          setConfigError(data.message || "Config endpoint returned failure.");
        }
      })
      .catch((err) => {
        setConfigError(String(err));
        setConfigLoading(false);
      });
  }, [siteKey]);

  // Attach to window.CMP once it's ready.
  useEffect(() => {
    if (!siteKey) return;

    function tryAttach() {
      const cmp = (window as unknown as { CMP?: {
        getConsent: () => ConsentState;
        onConsentChange: (fn: (c: ConsentState) => void) => void;
      } }).CMP;
      if (cmp && typeof cmp.getConsent === "function") {
        setConsentState(cmp.getConsent());
        cmp.onConsentChange((c) => {
          setConsentState(c);
          log("onConsentChange fired");
        });
        log("CMP API attached to window");
        return true;
      }
      return false;
    }

    if (tryAttach()) return;

    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      if (tryAttach() || tries > 40) {
        window.clearInterval(id);
      }
    }, 150);

    const handler = () => log("cmp:openPreferenceCenter event received");
    window.addEventListener("cmp:openPreferenceCenter", handler);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("cmp:openPreferenceCenter", handler);
    };
  }, [siteKey]);

  function callCmp(method: "showBanner" | "acceptAll" | "rejectAll" | "openPreferenceCenter" | "withdrawConsent") {
    const cmp = (window as unknown as { CMP?: Record<string, () => void> }).CMP;
    if (!cmp || typeof cmp[method] !== "function") {
      alert(`window.CMP not ready yet — wait a moment and retry.`);
      return;
    }
    cmp[method]();
    log(`Called CMP.${method}()`);
  }

  function onSubmitSiteKey(e: React.FormEvent) {
    e.preventDefault();
    const k = inputKey.trim();
    if (!k) return;
    pushRecentKey(k);
    // Replace current URL with new siteKey so the SDK script re-mounts cleanly.
    const next = new URL(window.location.href);
    next.searchParams.set("siteKey", k);
    window.location.assign(next.toString());
  }

  function loadRecent(k: string) {
    pushRecentKey(k);
    const next = new URL(window.location.href);
    next.searchParams.set("siteKey", k);
    window.location.assign(next.toString());
  }

  function switchOrigin(originMode: "same" | "cross") {
    const current = new URL(window.location.href);
    const target = originMode === "cross"
      ? (current.hostname === "localhost" ? "127.0.0.1" : "localhost")
      : current.hostname;
    if (target === current.hostname) return;
    const next = new URL(current.toString());
    next.hostname = target;
    window.location.assign(next.toString());
  }

  const bannerCfg = configResponse?.bannerConfig;
  const hasConfig = configResponse?.success === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">CMP SDK — External Website Demo</h1>
            <p className="text-sm text-slate-500 mt-1">
              Simulates a third-party website embedding the public CMP SDK. Paste your site key below.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono bg-slate-100 rounded-lg px-3 py-1.5">
            {siteKey ? (
              <>
                siteKey: <span className="font-semibold text-slate-800">{siteKey}</span>
              </>
            ) : (
              "enter site key →"
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Site key input form */}
        {!siteKey && (
          <section className="rounded-2xl card-shadow bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Enter your site key</h2>
            <p className="text-sm text-slate-500 mb-4">
              Found on your website&apos;s Installation page in the dashboard. You can also append{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">
                ?siteKey=YOUR_KEY
              </code>{" "}
              to the URL.
            </p>
            <form onSubmit={onSubmitSiteKey} className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="site_..."
                className="flex-1 h-11 rounded-xl border border-slate-300 px-4 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <button
                type="submit"
                className="h-11 rounded-xl gradient-primary text-white font-medium px-6 soft-shadow hover:opacity-95"
              >
                Load SDK
              </button>
            </form>

            {recentKeys.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Recently used
                  </div>
                  <button
                    type="button"
                    onClick={clearRecentKeys}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear history
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentKeys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => loadRecent(k)}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                      title={`Load ${k}`}
                    >
                      {k.length > 24 ? k.slice(0, 8) + "…" + k.slice(-8) : k}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* SDK script — mounted only when siteKey is present, matching how an
             external website would include it in <head>. */}
        {siteKey && <Script src={scriptSrc} strategy="beforeInteractive" />}

        {/* Test: analytics script that should be blocked until consent. */}
        {siteKey && (
          <script
            type="text/plain"
            data-cmp-purpose="analytics"
            dangerouslySetInnerHTML={{
              __html: `console.log('[CMP Demo] ⚠️  analytics script EXECUTED — if you see this before granting analytics consent, enforcement is BROKEN');`,
            }}
          />
        )}

        {/* Test: marketing script blocked until consent. */}
        {siteKey && (
          <script
            type="text/plain"
            data-cmp-purpose="marketing"
            dangerouslySetInnerHTML={{
              __html: `console.log('[CMP Demo] ⚠️  marketing script EXECUTED');`,
            }}
          />
        )}

        {/* Test: essential script (no purpose tag) — always allowed. */}
        {siteKey && (
          <Script id="cmp-demo-essential" strategy="afterInteractive">
            {`console.log('[CMP Demo] ✅ essential script always runs');`}
          </Script>
        )}

        {siteKey && (
          <section className="rounded-2xl card-shadow bg-white p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-1">Testing Controls</h2>
                <p className="text-sm text-slate-500">
                  Reset state, test cross-origin requests, or change site key.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={clearCurrentConsentStorage}
                  className="h-10 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm px-4"
                >
                  Reset consent storage
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new URL(window.location.href);
                    next.searchParams.delete("siteKey");
                    window.location.assign(next.toString());
                  }}
                  className="h-10 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm px-4"
                >
                  Change site key
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Cross-origin testing
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  localhost ↔ 127.0.0.1 are different origins. Switch to verify CORS headers on all SDK requests.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => switchOrigin("same")}
                    className="h-9 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 px-3"
                  >
                    Same origin ({pageProtocol}//<span className="font-mono">{currentHostname}</span>)
                  </button>
                  <button
                    type="button"
                    onClick={() => switchOrigin("cross")}
                    className="h-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 px-3"
                  >
                    Switch to {currentHostname === "localhost" ? "127.0.0.1" : "localhost"} (cross-origin)
                  </button>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Quick URL params
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Append a siteKey directly or reload with the current key preserved.
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs font-mono text-slate-600 break-all">
                  ?siteKey=<span className="text-slate-900">{siteKey}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {siteKey && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: API tester + state */}
            <div className="space-y-6">
              <div className="rounded-2xl card-shadow bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">CMP Public API</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => callCmp("showBanner")}
                    className="h-10 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm"
                  >
                    showBanner
                  </button>
                  <button
                    onClick={() => callCmp("openPreferenceCenter")}
                    className="h-10 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 text-sm"
                  >
                    openPreferenceCenter
                  </button>
                  <button
                    onClick={() => callCmp("acceptAll")}
                    className="h-10 rounded-xl gradient-primary text-white font-medium text-sm soft-shadow"
                  >
                    acceptAll
                  </button>
                  <button
                    onClick={() => callCmp("rejectAll")}
                    className="h-10 rounded-xl border border-rose-300 text-rose-700 font-medium hover:bg-rose-50 text-sm"
                  >
                    rejectAll
                  </button>
                  <button
                    onClick={() => callCmp("withdrawConsent")}
                    className="h-10 rounded-xl border border-amber-300 text-amber-700 font-medium hover:bg-amber-50 text-sm col-span-2 md:col-span-1"
                  >
                    withdrawConsent
                  </button>
                </div>

                <div className="rounded-xl bg-slate-900 text-slate-100 p-4 text-xs font-mono">
                  <div className="text-slate-400 mb-2">window.CMP.getConsent()</div>
                  <pre className="whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(consentState, null, 2) || "// loading…"}
                  </pre>
                </div>
              </div>

              <div className="rounded-2xl card-shadow bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">Event Log</h2>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 h-48 overflow-y-auto text-xs font-mono space-y-1">
                  {eventLog.length === 0 ? (
                    <div className="text-slate-400">// no events yet — interact with the banner above</div>
                  ) : (
                    eventLog.map((line, i) => (
                      <div key={i} className="text-slate-700">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right column: config preview + summary */}
            <div className="space-y-6">
              <div className="rounded-2xl card-shadow bg-white p-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Configuration preview
                  </h2>
                  {configLoading ? (
                    <span className="text-xs text-slate-500">loading…</span>
                  ) : configError ? (
                    <span className="text-xs font-medium text-rose-600 bg-rose-50 rounded-full px-2.5 py-0.5">
                      error
                    </span>
                  ) : hasConfig ? (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">
                      ready
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">unknown</span>
                  )}
                </div>

                {configError && (
                  <div className="text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3 mb-3">
                    {configError}
                  </div>
                )}

                {hasConfig && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 mb-1">Website ID</div>
                        <div className="font-mono text-xs text-slate-800 break-all">
                          {configResponse.websiteId}
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 mb-1">Policy</div>
                        <div className="text-sm font-medium text-slate-800">
                          {configResponse.policy?.name || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          v{configResponse.policy?.version ?? "?"}
                          {configResponse.policy?.isPublished ? " · published" : " · draft"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-indigo-50 p-3">
                        <div className="text-lg font-semibold text-indigo-700">
                          {configResponse.purposes?.length || 0}
                        </div>
                        <div className="text-xs text-indigo-600/80">purposes</div>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <div className="text-lg font-semibold text-emerald-700">
                          {configResponse.vendors?.length || 0}
                        </div>
                        <div className="text-xs text-emerald-600/80">vendors</div>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3">
                        <div className="text-lg font-semibold text-amber-700">
                          {configResponse.trackerRules?.length || 0}
                        </div>
                        <div className="text-xs text-amber-600/80">trackers</div>
                      </div>
                    </div>

                    {bannerCfg && (
                      <div className="rounded-xl border border-slate-200 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                          Banner
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-500">position: </span>
                            <span className="font-medium">{bannerCfg.position || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">layout: </span>
                            <span className="font-medium">{bannerCfg.layout || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">default: </span>
                            <span className="font-medium">{bannerCfg.defaultConsent || "none"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">color: </span>
                            <span
                              className="inline-block w-4 h-4 rounded border"
                              style={{
                                background: bannerCfg.primaryColor || "#000",
                              }}
                            />
                            <span className="font-mono">{bannerCfg.primaryColor}</span>
                          </div>
                        </div>
                        <div className="mt-3 text-xs">
                          <div className="text-slate-500 mb-1">title</div>
                          <div className="font-medium text-slate-800">
                            {bannerCfg.title || "(empty)"}
                          </div>
                          <div className="text-slate-500 mt-2 mb-1">description</div>
                          <div className="text-slate-700">
                            {bannerCfg.description || "(empty)"}
                          </div>
                        </div>
                      </div>
                    )}

                    {configResponse.locale && (
                      <div className="text-xs text-slate-600">
                        Locale:{" "}
                        <span className="font-medium text-slate-800">
                          {configResponse.locale.language || "?"}
                          {" · "}
                          {configResponse.locale.region || "global"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl card-shadow bg-white p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">Installed Snippet</h2>
                <p className="text-sm text-slate-500 mb-3">
                  The script tag being loaded by this demo page, exactly as shown on your
                  Installation page:
                </p>
                <pre className="rounded-xl bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
{`<script
  src="/api/sdk/script?siteKey=${siteKey}"
  data-site-key="${siteKey}"
  async
></script>`}
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* Footer help */}
        <section className="rounded-2xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-900 mb-2">Troubleshooting</h3>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Open the browser console to see SDK logs. Enable extra debug with{" "}
              <code className="rounded bg-slate-100 px-1 font-mono">window.__CMP_DEBUG = true</code>.
            </li>
            <li>
              If the banner does not appear: verify an <em>active, default consent policy</em> exists
              for this website with at least one attached purpose.
            </li>
            <li>
              The banner respects <code className="rounded bg-slate-100 px-1 font-mono">localStorage</code>{" "}
              — clear storage or append{" "}
              <code className="rounded bg-slate-100 px-1 font-mono">
                #reset
              </code>{" "}
              + reload to force a fresh state.
            </li>
            <li>
              All SDK calls go cross-origin. The config, consent-record, and withdraw endpoints
              return <code className="rounded bg-slate-100 px-1 font-mono">Access-Control-Allow-Origin: *</code>.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default function SdkDemoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-500">Loading SDK demo…</div>}>
      <SdkDemoInner />
    </Suspense>
  );
}
