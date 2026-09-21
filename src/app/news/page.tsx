import type { Metadata } from "next";

import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { NewsFeed } from "@/components/public/news-feed";
import { SkipLink } from "@/components/ui/skip-link";
import { formatNewsTime } from "@/content/news-sources";
import { getNewsFeed } from "@/lib/news-rss";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";

export const revalidate = 600;

const title = "News";
const description =
  "Live privacy, security, and consent headlines from IAPP, TechCrunch, The Hacker News, BleepingComputer, Dark Reading, SecurityWeek, CyberScoop, KrebsOnSecurity, SC Media, and Privacy Affairs.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/news"),
  ...socialMetadata({
    title: `${title} — Consent Guru`,
    description,
    path: "/news",
  }),
};

export default async function NewsPage() {
  const feed = await getNewsFeed();
  const liveCount = feed.sources.filter((source) => source.ok).length;

  return (
    <div className="public-page min-h-screen bg-white text-[#111827]">
      <SkipLink />
      <HomeNavbar />
      <main id="main-content">
        <section
          className="relative overflow-hidden border-b border-[#E5E7EB]"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(0,196,167,0.16), transparent 55%), linear-gradient(180deg, #ffffff 0%, #F3FAF8 100%)",
          }}
        >
          <div className="relative mx-auto max-w-[1200px] px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00C4A7]">News</p>
            <h1 className="mt-3 max-w-3xl text-balance text-[2.4rem] font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl">
              Privacy and security headlines, live from the wire
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4B5563] sm:text-base">
              RSS from IAPP, TechCrunch Security, The Hacker News, BleepingComputer, Dark Reading,
              SecurityWeek, CyberScoop, KrebsOnSecurity, SC Media, and Privacy Affairs. Stories open
              on the publisher site. This is not Consent Guru reporting.
            </p>
            <p className="mt-3 text-sm text-[#6B7280]">
              {liveCount} of {feed.sources.length} channels live · refreshed about every 10 minutes ·
              last pull {formatNewsTime(feed.fetchedAt)}
            </p>
          </div>
        </section>

        <section className="bg-white px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-[900px]">
            <NewsFeed articles={feed.articles} sources={feed.sources} />
            {feed.sources.some((source) => !source.ok) ? (
              <p className="mt-6 text-xs leading-5 text-[#6B7280]">
                Temporarily unavailable:{" "}
                {feed.sources
                  .filter((source) => !source.ok)
                  .map((source) => source.name)
                  .join(", ")}
                .
              </p>
            ) : null}
          </div>
        </section>
      </main>
      <HomeFooter />
    </div>
  );
}
