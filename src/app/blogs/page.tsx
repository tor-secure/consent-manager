import type { Metadata } from "next";
import { SkipLink } from "@/components/ui/skip-link";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeInteractions } from "@/components/public/home-interactions";
import { HomeNavbar } from "@/components/public/home-navbar";
import { ArticleLibrary } from "@/components/public/article-library";
import { getAllBlogs } from "@/content/blogs";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

const blogsTitle = "Blog";
const blogsDescription =
  "Consent Guru articles on consent management, cookie banners, DPDP, GDPR, CCPA/CPRA, DSAR workflows, and Google Consent Mode.";

export const metadata: Metadata = {
  title: blogsTitle,
  description: blogsDescription,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/blogs"),
  ...socialMetadata({
    title: `${blogsTitle} — Consent Guru`,
    description: blogsDescription,
    path: "/blogs",
  }),
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
          className="relative overflow-x-clip overflow-y-visible border-b border-[#E5E7EB]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div className="relative mx-auto max-w-[1200px] px-5 py-3 sm:px-8 sm:py-5">
            <h1 className="mt-3 max-w-3xl text-balance text-[clamp(1.85rem,1.1rem+3vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-[#111827]">
              Privacy laws, consent, and the systems that make them real
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563] sm:text-base">
              Stay relevant with news of DPDP Act.
            </p>
          </div>
        </section>

        <section className="bg-white px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-[1200px]"><ArticleLibrary posts={blogs} /></div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
