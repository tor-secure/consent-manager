import type { MetadataRoute } from "next";

import { getAllBlogs } from "@/content/blogs";
import { SITE_URL } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blogs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/e-learning`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  const posts = getAllBlogs().map((post) => ({
    url: `${SITE_URL}/blogs/${post.slug}`,
    lastModified: new Date(`${post.publishedAt}T00:00:00+05:30`),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...posts];
}
