import type { MetadataRoute } from "next";

import { getAllBlogs } from "@/content/blogs";
import { SEO_LANDINGS } from "@/content/seo-landings";
import { SITE_URL } from "@/lib/site-metadata";

/** Stable date so the sitemap does not look freshly edited on every request. */
const CONTENT_UPDATED = new Date("2026-10-08T00:00:00+05:30");

const HIGH_PRIORITY = new Set([
  "/consent-management-platform",
  "/consent-management",
  "/dpdp",
  "/dpdp-compliance",
  "/cookie-consent-manager",
]);

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blogs`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/news`, lastModified: CONTENT_UPDATED, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/e-learning`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/dpdp-act`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/tools`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/tools/penalty-risk`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tools/readiness-gap`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tools/notice-auditor`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tools/compliance-timeline`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/tools/sdf-checker`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy-center`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy-center/privacy-policy`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-center/cookie-policy`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-center/data-processing-agreement`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-center/data-principal-request`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy-center/grievance`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy-center/track-request`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/privacy-center/consent-preferences`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/disclaimer`, lastModified: CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/faqs`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/dpo-as-service`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
    ...SEO_LANDINGS.map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly" as const,
      priority: HIGH_PRIORITY.has(page.path) ? 0.9 : 0.8,
    })),
  ];

  const posts = getAllBlogs().map((post) => ({
    url: `${SITE_URL}/blogs/${post.slug}`,
    lastModified: new Date(`${post.publishedAt}T00:00:00+05:30`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...posts];
}
