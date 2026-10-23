/** Short, stable anchors Google can use as brand sitelinks. Same labels in the header and on the homepage. */
export type PrimaryLink = {
  label: string;
  href: string;
  hash?: string;
};

export type PrimaryGroup = {
  type: "group";
  label: string;
  href: string;
  items: PrimaryLink[];
};

export type PrimaryEntry = ({ type: "link" } & PrimaryLink) | PrimaryGroup;

export const sitelinkPages: PrimaryLink[] = [
  { label: "Platform", href: "/consent-management-platform" },
  { label: "Cookie consent", href: "/cookie-consent-manager" },
  { label: "DPDP", href: "/dpdp" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blogs" },
  { label: "About", href: "/about" },
];

export const primaryNav: PrimaryEntry[] = [
  {
    type: "group",
    label: "Platform",
    href: "/consent-management-platform",
    items: [
      { label: "Consent platform", href: "/consent-management-platform" },
      { label: "Consent records", href: "/consent-records" },
      { label: "Preference center", href: "/privacy-preference-center" },
      { label: "How it works", href: "/#how-it-works", hash: "#how-it-works" },
    ],
  },
  { type: "link", label: "Cookie consent", href: "/cookie-consent-manager" },
  {
    type: "group",
    label: "DPDP",
    href: "/dpdp",
    items: [
      { label: "DPDP consent", href: "/dpdp" },
      { label: "DPDP Act", href: "/dpdp-act" },
      { label: "DPDP compliance", href: "/dpdp-compliance" },
      { label: "E-learning", href: "/e-learning" },
      { label: "DPDP tools", href: "/tools" },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
  { type: "link", label: "Blog", href: "/blogs" },
  {
    type: "group",
    label: "About",
    href: "/about",
    items: [
      { label: "About", href: "/about" },
      { label: "FAQs", href: "/faqs" },
      { label: "Privacy Centre", href: "/privacy-center" },
      { label: "Compare platforms", href: "/compare" },
      { label: "Privacy law for your region", href: "/privacy-law" },
      { label: "GDPR guide", href: "/gdpr-guide" },
      { label: "CCPA guide", href: "/ccpa-guide" },
      { label: "News", href: "/news" },
    ],
  },
];
