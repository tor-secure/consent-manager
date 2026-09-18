import type { Metadata } from "next";
import Link from "next/link";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { formatBlogDate, getAllBlogs } from "@/content/blogs";

export const metadata: Metadata = {
  title: "Blogs — Consent Guru",
  description:
    "Read up to 30 articles on DPDP, GDPR, CCPA, LGPD, and other privacy laws, plus why a consent manager matters.",
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00C4A7]">
              Insights
            </p>
            <h1 className="mt-3 max-w-3xl text-balance text-[2.2rem] font-bold leading-[1.1] tracking-tight text-[#111827] sm:text-5xl">
              Privacy laws, consent, and the systems that make them real
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563] sm:text-base">
              {blogs.length} articles on DPDP, GDPR, CPRA, LGPD, PIPL, PDPA, and other regimes — plus
              how a consent manager records choice, evidence, and withdrawal.
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
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#0B2C4A]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover}
                      alt={post.imageAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
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
