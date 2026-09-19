import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { BlogCover } from "@/components/public/blog-cover";
import {
  formatBlogDate,
  getAllBlogs,
  getBlogBySlug,
  getRelatedBlogs,
} from "@/content/blogs";
import { socialMetadata, SITE_NAME, SITE_URL } from "@/lib/site-metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogs().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) {
    return { title: "Article not found — Consent Guru" };
  }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blogs/${post.slug}` },
    ...socialMetadata({
      title: `${post.title} — Consent Guru`,
      description: post.excerpt,
      path: `/blogs/${post.slug}`,
      image: post.cover,
      imageAlt: post.imageAlt,
      type: "article",
      publishedTime: `${post.publishedAt}T00:00:00+05:30`,
    }),
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogBySlug(slug);
  if (!post) {
    notFound();
  }

  const related = getRelatedBlogs(post.slug);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.cover.startsWith("http") ? post.cover : `${SITE_URL}${post.cover}`,
    datePublished: `${post.publishedAt}T00:00:00+05:30`,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/blogs/${post.slug}`,
  };

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <main id="main-content">
        <article>
          <header className="border-b border-[#E5E7EB] bg-[#F3FAF8]">
            <div className="mx-auto max-w-[800px] px-5 py-5 sm:px-8 sm:py-7">
              <p>
                <Link
                  href="/blogs"
                  className="text-sm font-medium text-[#0B2C4A] transition hover:text-[#00C4A7]"
                >
                  ← All blogs
                </Link>
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                <span className="rounded-full bg-white px-2.5 py-1 text-[#0B2C4A] ring-1 ring-[#E5E7EB]">
                  {post.category}
                </span>
                <span>{post.region}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {formatBlogDate(post.publishedAt)} · {post.readMinutes} min read
                </span>
              </div>
              <h1 className="mt-4 text-balance text-[2rem] font-bold leading-[1.15] tracking-tight text-[#111827] sm:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-[16px] leading-7 text-[#4B5563]">{post.excerpt}</p>
            </div>
          </header>

          <div className="bg-white">
            <div className="mx-auto max-w-[800px] px-5 sm:px-8">
              <div className="-mt-2 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm sm:-mt-6">
                <BlogCover post={post} />
              </div>

              <div className="py-10 sm:py-12">
                {post.sections.map((section, index) => (
                  <section key={`${post.slug}-section-${index}`}>
                    {section.heading ? (
                      <h2 className="mt-10 text-xl font-semibold tracking-tight text-[#111827] first:mt-0">
                        {section.heading}
                      </h2>
                    ) : null}
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 48)}
                        className="mt-4 text-[16px] leading-8 text-[#374151]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))}

                <p className="mt-10 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-sm leading-6 text-[#6B7280]">
                  Educational overview only — not legal advice. Confirm requirements with counsel for
                  your products and markets.
                </p>
              </div>
            </div>
          </div>
        </article>

        <section className="border-t border-[#E5E7EB] bg-[#F3FAF8] px-5 py-12 sm:px-8">
          <div className="mx-auto max-w-[800px]">
            <h2 className="text-lg font-semibold text-[#111827]">Continue reading</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/blogs/${item.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition hover:border-[#00C4A7]/40"
                  >
                    <BlogCover post={item} className="rounded-none" />
                    <span className="p-3 text-sm font-medium leading-snug text-[#111827]">{item.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
