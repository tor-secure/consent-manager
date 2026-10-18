import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-metadata";

/**
 * Crawl policy for public marketing content.
 * Private surfaces are disallowed here for signal hygiene; access control remains
 * authentication and noindex headers — robots.txt is not an access-control layer.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
          "/e-learning/module/",
          "/e-learning/manage",
          "/e-learning/certificate",
          "/e-learning/final-exam",
          "/e-learning/sign-in",
          "/e-learning/sign-up",
          "/e-learning/session",
          "/learning/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
