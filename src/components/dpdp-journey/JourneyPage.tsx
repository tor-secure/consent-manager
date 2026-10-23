import type { ReactNode } from "react";
import { headers } from "next/headers";
import Script from "next/script";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SITE_NAME, SITE_URL } from "@/lib/site-metadata";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/marks.css";
import "./styles/app.css";
import "./styles/page.css";

/**
 * A law's journey page: the explainer between the site's navbar and footer,
 * with WebPage and BreadcrumbList structured data naming the legislation.
 */
export async function JourneyPage({
  path,
  title,
  description,
  crumb,
  legislation,
  language,
  children,
}: {
  path: string;
  title: string;
  description: string;
  /** The breadcrumb's last item. */
  crumb: string;
  legislation: { name: string; jurisdiction: string };
  language: string;
  /** The law's journey entry, e.g. `<GdprJourney />`. */
  children: ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const pageUrl = `${SITE_URL}${path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: title,
        description,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        inLanguage: language,
        about: {
          "@type": "Legislation",
          name: legislation.name,
          legislationJurisdiction: legislation.jurisdiction,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: crumb, item: pageUrl },
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
        id={`${path.slice(1)}-jsonld`}
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
      <div className="public-page fyd-footer">
        <HomeFooter />
      </div>
    </>
  );
}
