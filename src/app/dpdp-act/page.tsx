import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { DpdpJourney } from "@/components/dpdp-journey/DpdpJourney";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { DPDP_PAGE_DESCRIPTION, DPDP_PAGE_PATH, DPDP_PAGE_TITLE } from "@/content/dpdp-act";
import { INDEXABLE_ROBOTS, SITE_NAME, SITE_URL, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import "@/components/dpdp-journey/styles/tokens.css";
import "@/components/dpdp-journey/styles/base.css";
import "@/components/dpdp-journey/styles/marks.css";
import "@/components/dpdp-journey/styles/app.css";
import "@/components/dpdp-journey/styles/page.css";

export const metadata: Metadata = {
  title: DPDP_PAGE_TITLE,
  description: DPDP_PAGE_DESCRIPTION,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates(DPDP_PAGE_PATH),
  ...socialMetadata({
    title: `${DPDP_PAGE_TITLE} — Consent Management & Privacy Compliance`,
    description: DPDP_PAGE_DESCRIPTION,
    path: DPDP_PAGE_PATH,
  }),
};

export default async function DpdpActPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const pageUrl = `${SITE_URL}${DPDP_PAGE_PATH}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${DPDP_PAGE_TITLE} — Consent Management & Privacy Compliance`,
        description: DPDP_PAGE_DESCRIPTION,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        inLanguage: "en-IN",
        about: {
          "@type": "Legislation",
          name: "Digital Personal Data Protection Act, 2023",
          legislationJurisdiction: "IN",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "DPDP Act", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <>
      <div className="public-page fyd-nav">
        <HomeNavbar />
      </div>
      <Script
        id="dpdp-act-jsonld"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DpdpJourney />
      <div className="public-page fyd-footer">
        <HomeFooter />
      </div>
    </>
  );
}
