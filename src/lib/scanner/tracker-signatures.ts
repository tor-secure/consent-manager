// ---------------------------------------------------------------------------
// Known tracker signatures — domain → { name, type, category, riskLevel }
//
// Used by the HTML analyser to classify detected third-party resources.
// Sources: public tracker blocklists, EasyPrivacy, Disconnect.me categories.
// This is a representative starter set; a real deployment would pull from a
// maintained database or external feed.
// ---------------------------------------------------------------------------

export type TrackerType = "script" | "pixel" | "cookie" | "beacon" | "fingerprint" | "storage" | "other";
export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type TrackerSignature = {
  name: string;
  type: TrackerType;
  category: string;    // e.g. "analytics", "advertising", "social", "cdn", "support"
  riskLevel: RiskLevel;
};

// Key: lowercase domain (without leading dot).
export const TRACKER_SIGNATURES: Record<string, TrackerSignature> = {
  // ── Analytics ────────────────────────────────────────────────────────────
  "google-analytics.com":    { name: "Google Analytics",        type: "script",  category: "analytics",    riskLevel: "medium" },
  "analytics.google.com":   { name: "Google Analytics",        type: "script",  category: "analytics",    riskLevel: "medium" },
  "googletagmanager.com":   { name: "Google Tag Manager",      type: "script",  category: "analytics",    riskLevel: "medium" },
  "googletagservices.com":  { name: "Google Tag Services",     type: "script",  category: "advertising",  riskLevel: "medium" },
  "gtm.js":                 { name: "Google Tag Manager",      type: "script",  category: "analytics",    riskLevel: "medium" },
  "segment.com":            { name: "Segment",                 type: "script",  category: "analytics",    riskLevel: "medium" },
  "cdn.segment.com":        { name: "Segment",                 type: "script",  category: "analytics",    riskLevel: "medium" },
  "mixpanel.com":           { name: "Mixpanel",                type: "script",  category: "analytics",    riskLevel: "medium" },
  "cdn.mxpnl.com":          { name: "Mixpanel",                type: "script",  category: "analytics",    riskLevel: "medium" },
  "amplitude.com":          { name: "Amplitude",               type: "script",  category: "analytics",    riskLevel: "medium" },
  "cdn.amplitude.com":      { name: "Amplitude",               type: "script",  category: "analytics",    riskLevel: "medium" },
  "heap.io":                { name: "Heap Analytics",          type: "script",  category: "analytics",    riskLevel: "medium" },
  "heapanalytics.com":      { name: "Heap Analytics",          type: "script",  category: "analytics",    riskLevel: "medium" },
  "hotjar.com":             { name: "Hotjar",                  type: "script",  category: "analytics",    riskLevel: "medium" },
  "static.hotjar.com":      { name: "Hotjar",                  type: "script",  category: "analytics",    riskLevel: "medium" },
  "mouseflow.com":          { name: "Mouseflow",               type: "script",  category: "analytics",    riskLevel: "medium" },
  "fullstory.com":          { name: "FullStory",               type: "script",  category: "analytics",    riskLevel: "high"   },
  "rs6.net":                { name: "Constant Contact",        type: "pixel",   category: "marketing",    riskLevel: "medium" },
  "clarity.ms":             { name: "Microsoft Clarity",       type: "script",  category: "analytics",    riskLevel: "medium" },
  "plausible.io":           { name: "Plausible Analytics",     type: "script",  category: "analytics",    riskLevel: "low"    },
  "umami.is":               { name: "Umami",                   type: "script",  category: "analytics",    riskLevel: "low"    },

  // ── Advertising ──────────────────────────────────────────────────────────
  "doubleclick.net":        { name: "Google Ads (DoubleClick)", type: "pixel",  category: "advertising",  riskLevel: "high"   },
  "googlesyndication.com":  { name: "Google AdSense",          type: "script",  category: "advertising",  riskLevel: "high"   },
  "googleadservices.com":   { name: "Google Ads",              type: "script",  category: "advertising",  riskLevel: "high"   },
  "facebook.net":           { name: "Facebook Pixel",          type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "connect.facebook.net":   { name: "Facebook SDK",            type: "script",  category: "social",       riskLevel: "high"   },
  "analytics.twitter.com":  { name: "Twitter Analytics",       type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "static.ads-twitter.com": { name: "Twitter Ads",             type: "script",  category: "advertising",  riskLevel: "high"   },
  "linkedin.com":           { name: "LinkedIn Insight Tag",    type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "snap.licdn.com":         { name: "LinkedIn Insight",        type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "bat.bing.com":           { name: "Microsoft Ads (Bing)",    type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "sc-static.net":          { name: "Snapchat Pixel",          type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "tr.snapchat.com":        { name: "Snapchat Pixel",          type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "ads.tiktok.com":         { name: "TikTok Pixel",            type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "analytics.tiktok.com":   { name: "TikTok Analytics",        type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "criteo.com":             { name: "Criteo",                   type: "script",  category: "advertising",  riskLevel: "high"   },
  "static.criteo.net":      { name: "Criteo",                   type: "script",  category: "advertising",  riskLevel: "high"   },
  "adnxs.com":              { name: "AppNexus / Xandr",         type: "pixel",   category: "advertising",  riskLevel: "high"   },
  "amazon-adsystem.com":    { name: "Amazon Ads",               type: "script",  category: "advertising",  riskLevel: "high"   },

  // ── Social ────────────────────────────────────────────────────────────────
  "platform.twitter.com":   { name: "Twitter Widget",          type: "script",  category: "social",       riskLevel: "medium" },
  "platform.instagram.com": { name: "Instagram Widget",        type: "script",  category: "social",       riskLevel: "medium" },
  "apis.google.com":        { name: "Google APIs",             type: "script",  category: "social",       riskLevel: "low"    },
  "disqus.com":             { name: "Disqus",                  type: "script",  category: "social",       riskLevel: "medium" },
  "c.disquscdn.com":        { name: "Disqus CDN",              type: "script",  category: "social",       riskLevel: "medium" },

  // ── Fingerprinting / High risk ────────────────────────────────────────────
  "fingerprintjs.com":      { name: "FingerprintJS",           type: "fingerprint", category: "analytics", riskLevel: "high"  },
  "fingerprint.com":        { name: "Fingerprint Pro",         type: "fingerprint", category: "analytics", riskLevel: "high"  },

  // ── Support / Chat ────────────────────────────────────────────────────────
  "intercom.io":            { name: "Intercom",                type: "script",  category: "support",      riskLevel: "medium" },
  "widget.intercom.io":     { name: "Intercom Widget",         type: "script",  category: "support",      riskLevel: "medium" },
  "js.intercomcdn.com":     { name: "Intercom CDN",            type: "script",  category: "support",      riskLevel: "medium" },
  "zendesk.com":            { name: "Zendesk",                 type: "script",  category: "support",      riskLevel: "low"    },
  "zopim.com":              { name: "Zendesk Chat (Zopim)",    type: "script",  category: "support",      riskLevel: "medium" },
  "tawk.to":                { name: "Tawk.to",                 type: "script",  category: "support",      riskLevel: "medium" },
  "embed.tawk.to":          { name: "Tawk.to Widget",          type: "script",  category: "support",      riskLevel: "medium" },
  "crisp.chat":             { name: "Crisp Chat",              type: "script",  category: "support",      riskLevel: "medium" },
  "client.crisp.chat":      { name: "Crisp Chat Widget",       type: "script",  category: "support",      riskLevel: "medium" },
  "hubspot.com":            { name: "HubSpot",                 type: "script",  category: "marketing",    riskLevel: "medium" },
  "js.hs-scripts.com":      { name: "HubSpot Scripts",         type: "script",  category: "marketing",    riskLevel: "medium" },

  // ── A/B Testing ───────────────────────────────────────────────────────────
  "optimize.google.com":    { name: "Google Optimize",         type: "script",  category: "analytics",    riskLevel: "medium" },
  "optimizely.com":         { name: "Optimizely",              type: "script",  category: "analytics",    riskLevel: "medium" },
  "cdn.optimizely.com":     { name: "Optimizely CDN",          type: "script",  category: "analytics",    riskLevel: "medium" },
  "launchdarkly.com":       { name: "LaunchDarkly",            type: "script",  category: "analytics",    riskLevel: "low"    },

  // ── Performance / Error monitoring ───────────────────────────────────────
  "sentry.io":              { name: "Sentry",                  type: "script",  category: "performance",  riskLevel: "low"    },
  "browser.sentry-cdn.com": { name: "Sentry Browser SDK",      type: "script",  category: "performance",  riskLevel: "low"    },
  "newrelic.com":           { name: "New Relic",               type: "script",  category: "performance",  riskLevel: "low"    },
  "datadog-browser-agent.com": { name: "Datadog RUM",          type: "script",  category: "performance",  riskLevel: "low"    },
};

// ---------------------------------------------------------------------------
// matchDomain — returns a TrackerSignature if the given hostname matches a
// known tracker, checking exact match first then suffix match.
// ---------------------------------------------------------------------------

export function matchDomain(hostname: string): (TrackerSignature & { matchedDomain: string }) | null {
  const lower = hostname.toLowerCase().replace(/^www\./, "");

  // Exact match.
  if (TRACKER_SIGNATURES[lower]) {
    return { ...TRACKER_SIGNATURES[lower], matchedDomain: lower };
  }

  // Walk up the domain hierarchy: sub.example.com → example.com → com
  const parts = lower.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (TRACKER_SIGNATURES[candidate]) {
      return { ...TRACKER_SIGNATURES[candidate], matchedDomain: candidate };
    }
  }

  return null;
}
