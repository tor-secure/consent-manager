import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/blogs",
          "/blogs/",
          "/news",
          "/e-learning",
          "/dpdp-act",
          "/tools",
          "/privacy-center",
          "/privacy-center/",
          "/privacy-center/data-principal-request",
          "/privacy-center/grievance",
          "/privacy-center/track-request",
          "/privacy-center/consent-preferences",
          "/disclaimer",
          "/faqs",
          "/pricing",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/sign-in",
          "/sign-up",
          "/create-organization",
          "/sdk-demo",
          "/privacy-request",
          "/guardian-consent",
          "/api/",
          "/e2e-customer-contact.html",
          "/e2e-customer-products.html",
          "/e2e-customer-site.html",
          "/e2e-customer-about.html",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
