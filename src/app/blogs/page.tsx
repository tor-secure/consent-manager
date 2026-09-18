import type { Metadata } from "next";
import Link from "next/link";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { BlogCover } from "@/components/public/blog-cover";
import { formatBlogDate, getAllBlogs } from "@/content/blogs";

export const metadata: Metadata = {
  title: "Blogs — Consent Guru",
  description: "Stay relevant with news of the DPDP Act and related privacy topics.",
};

export default function BlogsPage() {
  const blogs = getAllBlogs();

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeInteractions />
      <HomeNavbar />
      <main id="main-content">
        <section
          className="relative overflow-hidden border-b border-[#E5E7EB]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div className="relative mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00C4A7] sm:text-base">
              Blogs
            </p>
            <h1 className="mt-3 max-w-3xl text-balance text-[2.6rem] font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-6xl">
              Privacy laws, consent, and the systems that make them real
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563] sm:text-base">
              Stay relevant with news of DPDP Act.
            </p>
          </div>
        </section>

        <section className="bg-white px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto grid max-w-[1200px] gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((post) => (
              <article key={post.slug}>
                <Link
                  href={`/blogs/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#00C4A7]/40 hover:shadow-md"
                >
                  <BlogCover post={post} />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                      <span className="rounded-full bg-[#E6F9F5] px-2.5 py-1 text-[#0B2C4A]">
                        {post.category}
                      </span>
                      <span>{post.region}</span>
                    </div>
                    <h2 className="text-lg font-semibold leading-snug tracking-tight text-[#111827] group-hover:text-[#0B2C4A]">
                      {post.title}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-6 text-[#4B5563]">{post.excerpt}</p>
                    <p className="mt-auto pt-2 text-[12px] text-[#6B7280]">
                      {formatBlogDate(post.publishedAt)} · {post.readMinutes} min read
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
