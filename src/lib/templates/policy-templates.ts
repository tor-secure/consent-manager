import type { BannerConfiguration, ConsentDefault } from "@/lib/banner-config";
import { PURPOSE_TEMPLATES } from "@/lib/templates/purpose-templates";

export type PolicyTemplateBanner = Pick<
  BannerConfiguration,
  "title" | "description" | "defaultConsent" | "layout" | "position" | "region" | "showRejectAll"
>;

export type PolicyTemplate = {
  id: string;
  name: string;
  summary: string;
  description: string;
  regionLabel: string;
  purposeKeys: string[];
  banner: PolicyTemplateBanner;
};

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "custom",
    name: "Start from scratch",
    summary: "Empty draft — add your own purposes later",
    description: "Create a blank policy and attach purposes yourself.",
    regionLabel: "Any",
    purposeKeys: [],
    banner: {
      title: "We value your privacy",
      description:
        "We use cookies and similar technologies to run this site and, with your permission, to measure usage and show relevant content.",
      defaultConsent: "none",
      layout: "bar",
      position: "bottom",
      region: "",
      showRejectAll: true,
    },
  },
  {
    id: "gdpr-standard",
    name: "Standard (GDPR / ePrivacy)",
    summary: "Necessary, functional, analytics, and advertising",
    description:
      "Opt-in banner for EU/UK-style sites. Necessary cookies stay on; analytics and ads wait for a choice.",
    regionLabel: "EU / UK",
    purposeKeys: ["necessary", "functional", "analytics", "advertising"],
    banner: {
      title: "We use cookies",
      description:
        "We use necessary cookies to make this site work. With your consent, we also use analytics and advertising cookies. You can change your choices at any time.",
      defaultConsent: "none",
      layout: "bar",
      position: "bottom",
      region: "EU",
      showRejectAll: true,
    },
  },
  {
    id: "dpdp-india",
    name: "India (DPDP)",
    summary: "Necessary plus analytics, ads, and personalization",
    description:
      "Notice-and-consent style policy for India DPDP. Visitors can accept, reject, or customise purposes.",
    regionLabel: "India",
    purposeKeys: ["necessary", "functional", "analytics", "advertising", "personalization"],
    banner: {
      title: "Your privacy choices",
      description:
        "We process personal data for the purposes described here. Necessary processing keeps the site working. Other purposes require your consent, which you can withdraw later.",
      defaultConsent: "none",
      layout: "dialog",
      position: "center",
      region: "IN",
      showRejectAll: true,
    },
  },
  {
    id: "us-opt-out",
    name: "US (CCPA-style opt-out)",
    summary: "Notice with analytics and advertising you can opt out of",
    description:
      "US-oriented notice. Analytics and advertising start from an opt-out default; visitors can still customise.",
    regionLabel: "United States",
    purposeKeys: ["necessary", "analytics", "advertising"],
    banner: {
      title: "Your privacy choices",
      description:
        "We use cookies to run this site and to measure and advertise. You can opt out of sale/share-style advertising and analytics cookies below.",
      defaultConsent: "opt-out" as ConsentDefault,
      layout: "bar",
      position: "bottom",
      region: "US",
      showRejectAll: true,
    },
  },
  {
    id: "analytics-only",
    name: "Necessary + analytics",
    summary: "Lean setup for sites without ads",
    description: "Only essential cookies and optional analytics. No advertising purpose.",
    regionLabel: "Any",
    purposeKeys: ["necessary", "analytics"],
    banner: {
      title: "Cookie notice",
      description:
        "We use necessary cookies to run this site. If you agree, we also use analytics cookies to understand how the site is used.",
      defaultConsent: "none",
      layout: "box",
      position: "bottom",
      region: "",
      showRejectAll: true,
    },
  },
  {
    id: "uk-gdpr",
    name: "UK (UK GDPR)",
    summary: "Necessary, functional, analytics, and advertising",
    description:
      "Opt-in notice for UK sites. Necessary cookies stay on; analytics and ads wait for a choice.",
    regionLabel: "United Kingdom",
    purposeKeys: ["necessary", "functional", "analytics", "advertising"],
    banner: {
      title: "Cookies on this site",
      description:
        "We use necessary cookies to make this site work. With your consent we also use analytics and advertising cookies. You can reject non-essential cookies or change your choices at any time.",
      defaultConsent: "none",
      layout: "bar",
      position: "bottom",
      region: "UK",
      showRejectAll: true,
    },
  },
  {
    id: "canada-pipeda",
    name: "Canada (PIPEDA)",
    summary: "Necessary, functional, and analytics",
    description:
      "Notice-and-choice policy for Canadian sites. Advertising is omitted; visitors can still reject optional analytics.",
    regionLabel: "Canada",
    purposeKeys: ["necessary", "functional", "analytics"],
    banner: {
      title: "Privacy notice",
      description:
        "We use cookies needed to run this site. With your consent we also use cookies to remember preferences and measure how the site is used.",
      defaultConsent: "none",
      layout: "box",
      position: "bottom",
      region: "CA",
      showRejectAll: true,
    },
  },
  {
    id: "australia-privacy",
    name: "Australia (Privacy Act)",
    summary: "Necessary, analytics, and advertising",
    description:
      "Clear notice for Australian sites with optional analytics and ads, plus a reject control.",
    regionLabel: "Australia",
    purposeKeys: ["necessary", "analytics", "advertising"],
    banner: {
      title: "How we use cookies",
      description:
        "We use essential cookies to operate this site. Optional analytics and advertising cookies are used only if you agree.",
      defaultConsent: "none",
      layout: "bar",
      position: "bottom",
      region: "AU",
      showRejectAll: true,
    },
  },
  {
    id: "ecommerce",
    name: "Ecommerce",
    summary: "Full stack including personalization and ads",
    description:
      "Storefront-oriented policy with necessary, functional, analytics, advertising, and personalization purposes.",
    regionLabel: "Any",
    purposeKeys: ["necessary", "functional", "analytics", "advertising", "personalization"],
    banner: {
      title: "We use cookies to improve your shop",
      description:
        "Necessary cookies keep checkout and your cart working. Other cookies help us remember preferences, measure visits, and show relevant offers if you agree.",
      defaultConsent: "none",
      layout: "box",
      position: "bottom",
      region: "",
      showRejectAll: true,
    },
  },
  {
    id: "content-site",
    name: "Publisher / content",
    summary: "Analytics, ads, and personalization for media sites",
    description:
      "Centered dialog for content sites that rely on measurement, advertising, and recommended articles.",
    regionLabel: "Any",
    purposeKeys: ["necessary", "analytics", "advertising", "personalization"],
    banner: {
      title: "Your privacy choices",
      description:
        "We use essential cookies to run this site. With your consent we also measure readership, personalise content, and fund the site with advertising.",
      defaultConsent: "none",
      layout: "dialog",
      position: "center",
      region: "",
      showRejectAll: true,
    },
  },
];

export function getPolicyTemplate(id: string): PolicyTemplate | undefined {
  return POLICY_TEMPLATES.find((t) => t.id === id);
}

export function purposeTemplatesForPolicy(template: PolicyTemplate) {
  return PURPOSE_TEMPLATES.filter((p) => template.purposeKeys.includes(p.key));
}
