import type { BannerConfiguration } from "@/lib/banner-config";

export type BannerPresetCategory = "layout" | "look" | "region";

export type BannerPreset = {
  id: string;
  label: string;
  description: string;
  category: BannerPresetCategory;
  overrides: Partial<BannerConfiguration>;
};

export const BANNER_PRESET_CATEGORIES: { id: BannerPresetCategory; label: string }[] = [
  { id: "layout", label: "Layout" },
  { id: "look", label: "Look" },
  { id: "region", label: "Region" },
];

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "bottom-bar",
    label: "Bottom bar",
    description: "Full-width notice along the bottom edge",
    category: "layout",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      blockPageUntilConsent: false,
      backgroundColor: "#ffffff",
      primaryColor: "#2c4a7c",
      textColor: "#0f172a",
    },
  },
  {
    id: "top-bar",
    label: "Top bar",
    description: "Full-width notice under the browser chrome",
    category: "layout",
    overrides: {
      layout: "bar",
      position: "top",
      borderRadius: 0,
      overlayEnabled: false,
      blockPageUntilConsent: false,
      backgroundColor: "#0f172a",
      primaryColor: "#14b8a6",
      textColor: "#f8fafc",
    },
  },
  {
    id: "center-modal",
    label: "Center modal",
    description: "Dialog in the middle with a dimmed page",
    category: "layout",
    overrides: {
      layout: "dialog",
      position: "center",
      borderRadius: 16,
      overlayEnabled: true,
      blockPageUntilConsent: true,
      backgroundColor: "#ffffff",
      primaryColor: "#2c4a7c",
      textColor: "#111827",
    },
  },
  {
    id: "bottom-sheet",
    label: "Bottom sheet",
    description: "Rounded card rising from the bottom",
    category: "layout",
    overrides: {
      layout: "box",
      position: "bottom",
      borderRadius: 20,
      overlayEnabled: true,
      blockPageUntilConsent: false,
      backgroundColor: "#ffffff",
      primaryColor: "#0f766e",
      textColor: "#0f172a",
    },
  },
  {
    id: "floating-right",
    label: "Floating right",
    description: "Compact card in the lower-right corner",
    category: "layout",
    overrides: {
      layout: "box",
      position: "bottom-right",
      borderRadius: 14,
      overlayEnabled: false,
      blockPageUntilConsent: false,
      backgroundColor: "#ffffff",
      primaryColor: "#0f766e",
      textColor: "#134e4a",
    },
  },
  {
    id: "floating-left",
    label: "Floating left",
    description: "Compact card in the lower-left corner",
    category: "layout",
    overrides: {
      layout: "box",
      position: "bottom-left",
      borderRadius: 14,
      overlayEnabled: false,
      blockPageUntilConsent: false,
      backgroundColor: "#ffffff",
      primaryColor: "#2c4a7c",
      textColor: "#1e3a5f",
    },
  },
  {
    id: "navy-brand",
    label: "Navy brand",
    description: "ConsentFlow navy buttons on a white bar",
    category: "look",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      backgroundColor: "#ffffff",
      primaryColor: "#2c4a7c",
      textColor: "#0f172a",
    },
  },
  {
    id: "teal-accent",
    label: "Teal accent",
    description: "Teal actions on a soft off-white card",
    category: "look",
    overrides: {
      layout: "box",
      position: "bottom",
      borderRadius: 16,
      overlayEnabled: true,
      backgroundColor: "#f8fafc",
      primaryColor: "#0d9488",
      textColor: "#134e4a",
    },
  },
  {
    id: "dark-modal",
    label: "Dark modal",
    description: "Dark dialog for night-mode sites",
    category: "look",
    overrides: {
      layout: "dialog",
      position: "center",
      borderRadius: 18,
      overlayEnabled: true,
      blockPageUntilConsent: true,
      backgroundColor: "#0f172a",
      primaryColor: "#2dd4bf",
      textColor: "#e2e8f0",
    },
  },
  {
    id: "high-contrast",
    label: "High contrast",
    description: "Near-black type and a strong primary button",
    category: "look",
    overrides: {
      layout: "dialog",
      position: "center",
      borderRadius: 8,
      overlayEnabled: true,
      blockPageUntilConsent: true,
      backgroundColor: "#ffffff",
      primaryColor: "#0a0a0a",
      textColor: "#0a0a0a",
    },
  },
  {
    id: "soft-card",
    label: "Soft card",
    description: "Warm paper background, gentle corners",
    category: "look",
    overrides: {
      layout: "box",
      position: "bottom-right",
      borderRadius: 22,
      overlayEnabled: false,
      backgroundColor: "#fff7ed",
      primaryColor: "#c2410c",
      textColor: "#431407",
    },
  },
  {
    id: "minimal-bar",
    label: "Minimal bar",
    description: "Quiet top notice with a small radius",
    category: "look",
    overrides: {
      layout: "bar",
      position: "top",
      borderRadius: 0,
      overlayEnabled: false,
      backgroundColor: "#f1f5f9",
      primaryColor: "#334155",
      textColor: "#0f172a",
    },
  },
  {
    id: "compact-corner",
    label: "Compact corner",
    description: "Smaller floating panel, low intrusion",
    category: "look",
    overrides: {
      layout: "box",
      position: "bottom-right",
      borderRadius: 10,
      overlayEnabled: false,
      showPoweredBy: false,
      backgroundColor: "#ffffff",
      primaryColor: "#4338ca",
      textColor: "#1e1b4b",
    },
  },
  {
    id: "gdpr-standard",
    label: "GDPR notice",
    description: "Opt-in bar with reject and customize visible",
    category: "region",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      defaultConsent: "none",
      region: "EU",
      showRejectAll: true,
      showCustomize: true,
      showAcceptAll: true,
      backgroundColor: "#ffffff",
      primaryColor: "#1d4ed8",
      textColor: "#0f172a",
      title: "We use cookies",
      description:
        "We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.",
    },
  },
  {
    id: "us-opt-out",
    label: "US opt-out",
    description: "Bottom bar tuned for notice-and-opt-out",
    category: "region",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      defaultConsent: "opt-out",
      region: "US",
      showRejectAll: true,
      showCustomize: true,
      backgroundColor: "#ffffff",
      primaryColor: "#1e3a5f",
      textColor: "#0f172a",
      title: "Your privacy choices",
      description:
        "We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.",
    },
  },
  {
    id: "dpdp-dialog",
    label: "India DPDP",
    description: "Centered dialog for notice-and-consent",
    category: "region",
    overrides: {
      layout: "dialog",
      position: "center",
      borderRadius: 16,
      overlayEnabled: true,
      blockPageUntilConsent: true,
      defaultConsent: "none",
      region: "IN",
      showRejectAll: true,
      showCustomize: true,
      backgroundColor: "#ffffff",
      primaryColor: "#b45309",
      textColor: "#1c1917",
      title: "Your privacy choices",
      description:
        "We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.",
    },
  },
  {
    id: "cookie-wall",
    label: "Cookie wall",
    description: "Blocking centered notice until a choice is made",
    category: "look",
    overrides: {
      layout: "dialog",
      position: "center",
      borderRadius: 14,
      overlayEnabled: true,
      blockPageUntilConsent: true,
      closeOnOverlayClick: false,
      backgroundColor: "#ffffff",
      primaryColor: "#0f172a",
      textColor: "#0f172a",
    },
  },
  {
    id: "midnight-bar",
    label: "Midnight bar",
    description: "Dark full-width bar with teal actions",
    category: "look",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      backgroundColor: "#020617",
      primaryColor: "#2dd4bf",
      textColor: "#e2e8f0",
    },
  },
  {
    id: "sand-sheet",
    label: "Sand sheet",
    description: "Warm bottom sheet with amber buttons",
    category: "look",
    overrides: {
      layout: "box",
      position: "bottom",
      borderRadius: 24,
      overlayEnabled: true,
      backgroundColor: "#fffbeb",
      primaryColor: "#b45309",
      textColor: "#78350f",
    },
  },
  {
    id: "uk-notice",
    label: "UK GDPR",
    description: "Bottom bar with reject and customize for UK sites",
    category: "region",
    overrides: {
      layout: "bar",
      position: "bottom",
      borderRadius: 0,
      overlayEnabled: false,
      defaultConsent: "none",
      region: "UK",
      showRejectAll: true,
      showCustomize: true,
      backgroundColor: "#f8fafc",
      primaryColor: "#1d4ed8",
      textColor: "#0f172a",
      title: "Cookies on this site",
      description:
        "We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.",
    },
  },
];

export function presetMatchesConfig(preset: BannerPreset, config: BannerConfiguration): boolean {
  return (Object.keys(preset.overrides) as (keyof BannerConfiguration)[]).every((key) => {
    const expected = preset.overrides[key];
    return expected === undefined || config[key] === expected;
  });
}

export function findMatchingPreset(config: BannerConfiguration): BannerPreset | undefined {
  let best: BannerPreset | undefined;
  let bestCount = 0;
  for (const preset of BANNER_PRESETS) {
    if (!presetMatchesConfig(preset, config)) continue;
    const count = Object.keys(preset.overrides).length;
    if (count > bestCount) {
      best = preset;
      bestCount = count;
    }
  }
  return best;
}
