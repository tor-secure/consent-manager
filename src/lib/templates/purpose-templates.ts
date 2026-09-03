export type PurposeTemplate = {
  key: string;
  name: string;
  summary: string;
  description: string;
  isRequired: boolean;
  dataCategories: string[];
  retentionPeriod: string;
  legalBasis: "consent" | "legitimate_interest" | "legal_obligation" | "vital_interest" | "public_task";
};

export const PURPOSE_TEMPLATES: PurposeTemplate[] = [
  {
    key: "necessary",
    name: "Necessary",
    summary: "Security, login, and storing this consent choice",
    description:
      "These cookies are required for the website to work. They keep the site secure, remember your consent choice, and support essential features such as login.",
    isRequired: true,
    dataCategories: ["Cookie identifiers", "IP address", "Device identifiers"],
    retentionPeriod: "12 months",
    legalBasis: "legitimate_interest",
  },
  {
    key: "functional",
    name: "Functional",
    summary: "Language, region, and saved site preferences",
    description:
      "These cookies remember choices you make, such as language, region, or display settings, so the site works the way you prefer.",
    isRequired: false,
    dataCategories: ["User preferences", "Cookie identifiers", "Device identifiers"],
    retentionPeriod: "12 months",
    legalBasis: "consent",
  },
  {
    key: "analytics",
    name: "Analytics",
    summary: "How visitors use the site (page views, funnels)",
    description:
      "These cookies help us understand how visitors use the website, which pages are popular, and where people drop off, so we can improve the experience.",
    isRequired: false,
    dataCategories: ["IP address", "Device identifiers", "Browsing history", "Cookie identifiers"],
    retentionPeriod: "14 months",
    legalBasis: "consent",
  },
  {
    key: "advertising",
    name: "Advertising",
    summary: "Ads, retargeting, and conversion tracking",
    description:
      "These cookies are used to show relevant ads, measure campaigns, and build audiences. They may be set by us or by advertising partners.",
    isRequired: false,
    dataCategories: [
      "Cookie identifiers",
      "Device identifiers",
      "IP address",
      "Browsing history",
      "Location data",
    ],
    retentionPeriod: "13 months",
    legalBasis: "consent",
  },
  {
    key: "personalization",
    name: "Personalization",
    summary: "Content and product recommendations",
    description:
      "These cookies remember how you use the site so we can show more relevant content, products, or recommendations.",
    isRequired: false,
    dataCategories: ["User preferences", "Browsing history", "Cookie identifiers", "Device identifiers"],
    retentionPeriod: "12 months",
    legalBasis: "consent",
  },
];

export const PURPOSE_TEMPLATE_KEYS: string[] = PURPOSE_TEMPLATES.map((t) => t.key);

const PURPOSE_KEY_SET = new Set(PURPOSE_TEMPLATE_KEYS);

export function isPurposeTemplateKey(key: string): boolean {
  return PURPOSE_KEY_SET.has(key);
}

export function getPurposeTemplate(key: string): PurposeTemplate | undefined {
  return PURPOSE_TEMPLATES.find((t) => t.key === key);
}
