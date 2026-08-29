// ---------------------------------------------------------------------------
// Built-in vendor catalog
//
// A curated list of common third-party vendors that can be pre-populated into
// the vendor creation form. All data is static and client-safe (no imports
// from server-only modules).
//
// Fields mirror the vendors table + the form's controlled state:
//   name            → display name
//   key             → unique slug (lowercase, [a-z0-9_])
//   domain          → primary domain the tracker operates from
//   websiteUrl      → vendor product / service URL
//   privacyPolicyUrl → vendor privacy policy URL
//   country         → ISO 3166-1 alpha-2 country code
//   description     → short description shown to the user (editable)
//   source          → "custom" | "iab" | "google"
//   category        → grouping label used only in the UI selector
// ---------------------------------------------------------------------------

export type CatalogVendor = {
  name: string;
  key: string;
  domain: string;
  websiteUrl: string;
  privacyPolicyUrl: string;
  country: string;
  description: string;
  source: "custom" | "iab" | "google";
  category: string;
};

export const VENDOR_CATALOG: CatalogVendor[] = [
  // ── Analytics ─────────────────────────────────────────────────────────────
  {
    name: "Google Analytics 4",
    key: "google_analytics_4",
    domain: "google-analytics.com",
    websiteUrl: "https://analytics.google.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Google's web analytics service that tracks and reports website traffic.",
    source: "google",
    category: "Analytics",
  },
  {
    name: "Google Universal Analytics",
    key: "google_universal_analytics",
    domain: "google-analytics.com",
    websiteUrl: "https://analytics.google.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Previous generation of Google Analytics (UA / GA3).",
    source: "google",
    category: "Analytics",
  },
  {
    name: "Microsoft Clarity",
    key: "microsoft_clarity",
    domain: "clarity.ms",
    websiteUrl: "https://clarity.microsoft.com",
    privacyPolicyUrl: "https://privacy.microsoft.com/privacystatement",
    country: "US",
    description: "Microsoft's free heatmap and session recording analytics tool.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Mixpanel",
    key: "mixpanel",
    domain: "mixpanel.com",
    websiteUrl: "https://mixpanel.com",
    privacyPolicyUrl: "https://mixpanel.com/legal/privacy-policy/",
    country: "US",
    description: "Product analytics platform for tracking user interactions and funnels.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Amplitude",
    key: "amplitude",
    domain: "amplitude.com",
    websiteUrl: "https://amplitude.com",
    privacyPolicyUrl: "https://amplitude.com/privacy",
    country: "US",
    description: "Digital analytics platform for product and behavioural analytics.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Hotjar",
    key: "hotjar",
    domain: "hotjar.com",
    websiteUrl: "https://www.hotjar.com",
    privacyPolicyUrl: "https://www.hotjar.com/legal/policies/privacy/",
    country: "MT",
    description: "Heatmaps, session recordings, and feedback tools for websites.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Heap",
    key: "heap",
    domain: "heapanalytics.com",
    websiteUrl: "https://heap.io",
    privacyPolicyUrl: "https://heap.io/privacy",
    country: "US",
    description: "Auto-capture analytics platform that records every user interaction.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Segment",
    key: "segment",
    domain: "segment.com",
    websiteUrl: "https://segment.com",
    privacyPolicyUrl: "https://www.twilio.com/en-us/legal/privacy",
    country: "US",
    description: "Customer data platform (CDP) that collects and routes analytics events.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Plausible Analytics",
    key: "plausible",
    domain: "plausible.io",
    websiteUrl: "https://plausible.io",
    privacyPolicyUrl: "https://plausible.io/privacy",
    country: "EE",
    description: "Privacy-friendly, cookie-free web analytics alternative.",
    source: "custom",
    category: "Analytics",
  },
  {
    name: "Matomo",
    key: "matomo",
    domain: "matomo.org",
    websiteUrl: "https://matomo.org",
    privacyPolicyUrl: "https://matomo.org/privacy-policy/",
    country: "NZ",
    description: "Open-source web analytics platform with self-hosting option.",
    source: "custom",
    category: "Analytics",
  },

  // ── Advertising ───────────────────────────────────────────────────────────
  {
    name: "Google Ads",
    key: "google_ads",
    domain: "googleadservices.com",
    websiteUrl: "https://ads.google.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Google's online advertising platform for search and display ads.",
    source: "google",
    category: "Advertising",
  },
  {
    name: "Google Ad Manager",
    key: "google_ad_manager",
    domain: "doubleclick.net",
    websiteUrl: "https://admanager.google.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Google's programmatic advertising and ad serving platform.",
    source: "google",
    category: "Advertising",
  },
  {
    name: "Meta Pixel",
    key: "meta_pixel",
    domain: "facebook.net",
    websiteUrl: "https://www.facebook.com/business/tools/meta-pixel",
    privacyPolicyUrl: "https://www.facebook.com/privacy/policy/",
    country: "US",
    description: "Meta's conversion tracking pixel for Facebook and Instagram ads.",
    source: "custom",
    category: "Advertising",
  },
  {
    name: "LinkedIn Insight Tag",
    key: "linkedin_insight",
    domain: "linkedin.com",
    websiteUrl: "https://business.linkedin.com/marketing-solutions/insight-tag",
    privacyPolicyUrl: "https://www.linkedin.com/legal/privacy-policy",
    country: "US",
    description: "LinkedIn's conversion tracking and audience insight tag.",
    source: "custom",
    category: "Advertising",
  },
  {
    name: "Twitter / X Pixel",
    key: "twitter_pixel",
    domain: "ads-twitter.com",
    websiteUrl: "https://ads.twitter.com",
    privacyPolicyUrl: "https://twitter.com/en/privacy",
    country: "US",
    description: "Twitter/X universal website tag for conversion tracking.",
    source: "custom",
    category: "Advertising",
  },
  {
    name: "TikTok Pixel",
    key: "tiktok_pixel",
    domain: "analytics.tiktok.com",
    websiteUrl: "https://ads.tiktok.com",
    privacyPolicyUrl: "https://www.tiktok.com/legal/privacy-policy",
    country: "US",
    description: "TikTok's advertising pixel for tracking conversions and audiences.",
    source: "custom",
    category: "Advertising",
  },
  {
    name: "Criteo",
    key: "criteo",
    domain: "criteo.com",
    websiteUrl: "https://www.criteo.com",
    privacyPolicyUrl: "https://www.criteo.com/privacy/",
    country: "FR",
    description: "Retargeting and performance advertising network.",
    source: "custom",
    category: "Advertising",
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    name: "YouTube",
    key: "youtube",
    domain: "youtube.com",
    websiteUrl: "https://www.youtube.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Google's video hosting platform, often embedded via iframes.",
    source: "google",
    category: "Social",
  },
  {
    name: "Google Maps",
    key: "google_maps",
    domain: "maps.googleapis.com",
    websiteUrl: "https://maps.google.com",
    privacyPolicyUrl: "https://policies.google.com/privacy",
    country: "US",
    description: "Google Maps embeds and the Maps JavaScript API.",
    source: "google",
    category: "Social",
  },
  {
    name: "Facebook Social Plugins",
    key: "facebook_social",
    domain: "facebook.com",
    websiteUrl: "https://developers.facebook.com/docs/plugins",
    privacyPolicyUrl: "https://www.facebook.com/privacy/policy/",
    country: "US",
    description: "Facebook Like buttons, share widgets, and comment embeds.",
    source: "custom",
    category: "Social",
  },

  // ── Marketing / CRM ───────────────────────────────────────────────────────
  {
    name: "HubSpot",
    key: "hubspot",
    domain: "hubspot.com",
    websiteUrl: "https://www.hubspot.com",
    privacyPolicyUrl: "https://legal.hubspot.com/privacy-policy",
    country: "US",
    description: "CRM, marketing automation, live chat, and forms platform.",
    source: "custom",
    category: "Marketing",
  },
  {
    name: "Mailchimp",
    key: "mailchimp",
    domain: "mailchimp.com",
    websiteUrl: "https://mailchimp.com",
    privacyPolicyUrl: "https://mailchimp.com/legal/privacy/",
    country: "US",
    description: "Email marketing and marketing automation platform.",
    source: "custom",
    category: "Marketing",
  },
  {
    name: "Intercom",
    key: "intercom",
    domain: "intercom.io",
    websiteUrl: "https://www.intercom.com",
    privacyPolicyUrl: "https://www.intercom.com/legal/privacy",
    country: "US",
    description: "Customer messaging platform for support, onboarding, and marketing.",
    source: "custom",
    category: "Marketing",
  },
  {
    name: "Klaviyo",
    key: "klaviyo",
    domain: "klaviyo.com",
    websiteUrl: "https://www.klaviyo.com",
    privacyPolicyUrl: "https://www.klaviyo.com/legal/privacy-notice",
    country: "US",
    description: "Email and SMS marketing automation for e-commerce.",
    source: "custom",
    category: "Marketing",
  },
  {
    name: "Brevo (Sendinblue)",
    key: "brevo",
    domain: "brevo.com",
    websiteUrl: "https://www.brevo.com",
    privacyPolicyUrl: "https://www.brevo.com/legal/privacypolicy/",
    country: "FR",
    description: "Email marketing, SMS, and CRM platform.",
    source: "custom",
    category: "Marketing",
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  {
    name: "Stripe",
    key: "stripe",
    domain: "stripe.com",
    websiteUrl: "https://stripe.com",
    privacyPolicyUrl: "https://stripe.com/privacy",
    country: "US",
    description: "Online payment processing platform for internet businesses.",
    source: "custom",
    category: "Payments",
  },
  {
    name: "Razorpay",
    key: "razorpay",
    domain: "razorpay.com",
    websiteUrl: "https://razorpay.com",
    privacyPolicyUrl: "https://razorpay.com/privacy/",
    country: "IN",
    description: "Payment gateway for accepting online payments in India.",
    source: "custom",
    category: "Payments",
  },
  {
    name: "PayPal",
    key: "paypal",
    domain: "paypal.com",
    websiteUrl: "https://www.paypal.com",
    privacyPolicyUrl: "https://www.paypal.com/webapps/mpp/ua/privacy-full",
    country: "US",
    description: "Online payment system and digital wallet service.",
    source: "custom",
    category: "Payments",
  },
  {
    name: "Paddle",
    key: "paddle",
    domain: "paddle.com",
    websiteUrl: "https://www.paddle.com",
    privacyPolicyUrl: "https://www.paddle.com/legal/privacy",
    country: "GB",
    description: "Merchant of record and payments infrastructure for SaaS.",
    source: "custom",
    category: "Payments",
  },

  // ── Support / Chat ────────────────────────────────────────────────────────
  {
    name: "Zendesk",
    key: "zendesk",
    domain: "zendesk.com",
    websiteUrl: "https://www.zendesk.com",
    privacyPolicyUrl: "https://www.zendesk.com/company/agreements-and-terms/privacy-notice/",
    country: "US",
    description: "Customer support and helpdesk software platform.",
    source: "custom",
    category: "Support",
  },
  {
    name: "Drift",
    key: "drift",
    domain: "drift.com",
    websiteUrl: "https://www.drift.com",
    privacyPolicyUrl: "https://www.drift.com/privacy-policy/",
    country: "US",
    description: "Conversational marketing and sales platform with live chat.",
    source: "custom",
    category: "Support",
  },
  {
    name: "Crisp",
    key: "crisp",
    domain: "crisp.chat",
    websiteUrl: "https://crisp.chat",
    privacyPolicyUrl: "https://crisp.chat/en/privacy/",
    country: "FR",
    description: "Customer messaging and live chat platform.",
    source: "custom",
    category: "Support",
  },

  // ── Performance / CDN ─────────────────────────────────────────────────────
  {
    name: "Cloudflare",
    key: "cloudflare",
    domain: "cloudflare.com",
    websiteUrl: "https://www.cloudflare.com",
    privacyPolicyUrl: "https://www.cloudflare.com/privacypolicy/",
    country: "US",
    description: "CDN, DDoS protection, and performance optimisation services.",
    source: "custom",
    category: "Performance",
  },
  {
    name: "Sentry",
    key: "sentry",
    domain: "sentry.io",
    websiteUrl: "https://sentry.io",
    privacyPolicyUrl: "https://sentry.io/privacy/",
    country: "US",
    description: "Application error monitoring and performance tracking.",
    source: "custom",
    category: "Performance",
  },
  {
    name: "Datadog",
    key: "datadog",
    domain: "datadoghq.com",
    websiteUrl: "https://www.datadoghq.com",
    privacyPolicyUrl: "https://www.datadoghq.com/legal/privacy/",
    country: "US",
    description: "Cloud monitoring, APM, and security observability platform.",
    source: "custom",
    category: "Performance",
  },

  // ── A/B Testing ───────────────────────────────────────────────────────────
  {
    name: "Optimizely",
    key: "optimizely",
    domain: "optimizely.com",
    websiteUrl: "https://www.optimizely.com",
    privacyPolicyUrl: "https://www.optimizely.com/privacy/",
    country: "US",
    description: "A/B testing and experimentation platform.",
    source: "custom",
    category: "A/B Testing",
  },
  {
    name: "VWO",
    key: "vwo",
    domain: "vwo.com",
    websiteUrl: "https://vwo.com",
    privacyPolicyUrl: "https://vwo.com/privacy-policy/",
    country: "IN",
    description: "A/B testing, heatmaps, and conversion rate optimisation platform.",
    source: "custom",
    category: "A/B Testing",
  },
  {
    name: "LaunchDarkly",
    key: "launchdarkly",
    domain: "launchdarkly.com",
    websiteUrl: "https://launchdarkly.com",
    privacyPolicyUrl: "https://launchdarkly.com/policies/privacy/",
    country: "US",
    description: "Feature flag management and progressive delivery platform.",
    source: "custom",
    category: "A/B Testing",
  },
];

// ---------------------------------------------------------------------------
// Unique categories derived from the catalog (preserves insertion order).
// ---------------------------------------------------------------------------
export const CATALOG_CATEGORIES: string[] = [
  ...new Set(VENDOR_CATALOG.map((v) => v.category)),
];

// ---------------------------------------------------------------------------
// Search helper — returns entries whose name, domain, key, or category
// contain the query string (case-insensitive).
// ---------------------------------------------------------------------------
export function searchCatalog(query: string): CatalogVendor[] {
  const q = query.trim().toLowerCase();
  if (!q) return VENDOR_CATALOG;
  return VENDOR_CATALOG.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.domain.toLowerCase().includes(q) ||
      v.key.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q),
  );
}
