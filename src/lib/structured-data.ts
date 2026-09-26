import { PRIVACY_CENTRE_ORG } from "@/content/privacy-centre";
import {
  DEFAULT_DESCRIPTION,
  SHARE_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site-metadata";

export type Crumb = { name: string; path: string };

export type FaqEntry = { question: string; answer: string };

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function absoluteUrl(path: string) {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/brand/consent-guru-logo.svg`,
    },
    email: PRIVACY_CENTRE_ORG.supportEmail,
    description: DEFAULT_DESCRIPTION,
    address: {
      "@type": "PostalAddress",
      streetAddress: PRIVACY_CENTRE_ORG.addressLines.slice(0, 2).join(", "),
      addressLocality: "Mangalore",
      postalCode: "575003",
      addressRegion: "Karnataka",
      addressCountry: "IN",
    },
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-IN",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function softwareApplicationSchema() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Consent Management Platform",
    operatingSystem: "Web",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    image: `${SITE_URL}${SHARE_IMAGE_PATH}`,
    provider: { "@id": ORGANIZATION_ID },
  };
}

export function webPageSchema(input: { path: string; name: string; description: string }) {
  return {
    "@type": "WebPage",
    "@id": `${absoluteUrl(input.path)}#webpage`,
    url: absoluteUrl(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": `${SITE_URL}/#software` },
    inLanguage: "en-IN",
  };
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqSchema(faqs: FaqEntry[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function graphSchema(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
