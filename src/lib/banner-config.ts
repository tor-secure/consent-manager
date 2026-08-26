// ---------------------------------------------------------------------------
// BannerConfiguration — stored in consent_policy_versions.configuration JSONB
// This is the canonical type. Both the API route and the form component import
// from here to keep the shape in sync.
// ---------------------------------------------------------------------------

export type BannerPosition = "bottom" | "top" | "bottom-left" | "bottom-right" | "center";
export type BannerLayout = "bar" | "box" | "dialog";
export type ConsentDefault = "opt-in" | "opt-out" | "none";

export type BannerConfiguration = {
  // ------------------------------------------------------------------
  // Text
  // ------------------------------------------------------------------
  title: string;
  description: string;
  acceptAllLabel: string;
  rejectAllLabel: string;
  customizeLabel: string;
  savePreferencesLabel: string;
  privacyPolicyText: string;
  privacyPolicyUrl: string;
  poweredByText: string;

  // ------------------------------------------------------------------
  // Controls — which buttons to show
  // ------------------------------------------------------------------
  showAcceptAll: boolean;
  showRejectAll: boolean;
  showCustomize: boolean;
  showPoweredBy: boolean;
  showCloseButton: boolean;

  // ------------------------------------------------------------------
  // Purpose & vendor visibility in the preference center
  // ------------------------------------------------------------------
  showPurposeDescriptions: boolean;
  showVendorList: boolean;
  showLegalBasis: boolean;

  // ------------------------------------------------------------------
  // Behavior
  // ------------------------------------------------------------------
  defaultConsent: ConsentDefault;
  closeOnOverlayClick: boolean;
  blockPageUntilConsent: boolean;
  respectDoNotTrack: boolean;
  consentExpireDays: number;
  showOnEveryVisit: boolean;

  // ------------------------------------------------------------------
  // Locale
  // ------------------------------------------------------------------
  language: string;
  region: string;

  // ------------------------------------------------------------------
  // Appearance
  // ------------------------------------------------------------------
  position: BannerPosition;
  layout: BannerLayout;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  overlayEnabled: boolean;
};

// Sensible defaults used when no config has been saved yet.
export function defaultBannerConfig(): BannerConfiguration {
  return {
    title: "We value your privacy",
    description:
      "We use cookies and similar technologies to enhance your browsing experience, serve personalized content, and analyze traffic. By clicking \"Accept all\", you consent to our use of cookies.",
    acceptAllLabel: "Accept all",
    rejectAllLabel: "Reject all",
    customizeLabel: "Customize",
    savePreferencesLabel: "Save preferences",
    privacyPolicyText: "Privacy Policy",
    privacyPolicyUrl: "",
    poweredByText: "Powered by CMP",

    showAcceptAll: true,
    showRejectAll: true,
    showCustomize: true,
    showPoweredBy: true,
    showCloseButton: false,

    showPurposeDescriptions: true,
    showVendorList: true,
    showLegalBasis: false,

    defaultConsent: "none",
    closeOnOverlayClick: false,
    blockPageUntilConsent: false,
    respectDoNotTrack: true,
    consentExpireDays: 365,
    showOnEveryVisit: false,

    language: "en",
    region: "",

    position: "bottom",
    layout: "bar",
    primaryColor: "#171717",
    backgroundColor: "#ffffff",
    textColor: "#171717",
    borderRadius: 8,
    overlayEnabled: false,
  };
}

// Merge a partial/unknown stored object with the defaults to guarantee all
// fields exist at runtime (forward-compatible with new fields added later).
export function parseBannerConfig(raw: Record<string, unknown>): BannerConfiguration {
  const defaults = defaultBannerConfig();
  return { ...defaults, ...raw } as BannerConfiguration;
}
