"use client";

import { useMemo, useState } from "react";

import {
  formatNewsTime,
  type NewsArticle,
  type NewsSourceStatus,
} from "@/content/news-sources";

export function NewsFeed({
  articles,
  sources,
}: {
  articles: NewsArticle[];
  sources: NewsSourceStatus[];
}) {
  const [active, setActive] = useState("all");

  const visible = useMemo(() => {
    if (active === "all") return articles;
    return articles.filter((item) => item.sourceId === active);
  }, [active, articles]);

  return (
    <div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter news by source"
      >
        <button
          type="button"
          role="tab"
          aria-selected={active === "all"}
          onClick={() => setActive("all")}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            active === "all"
              ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
              : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#0B2C4A]/40"
          }`}
        >
          All sources
        </button>
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            role="tab"
            aria-selected={active === source.id}
            onClick={() => setActive(source.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              active === source.id
                ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#0B2C4A]/40"
            }`}
          >
            {source.name}
            <span className="ml-1.5 text-[11px] font-medium opacity-80">{source.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm leading-6 text-[#6B7280]">
          No stories from this source right now. Try another channel or check back after the next
          refresh.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[#E5E7EB] overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          {visible.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-5 transition hover:bg-[#F8FAFC] sm:px-6"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                  <span className="rounded-full bg-[#E6F9F5] px-2.5 py-1 text-[#0B2C4A]">
                    {item.sourceName}
                  </span>
                  <time dateTime={item.publishedAt ?? undefined}>{formatNewsTime(item.publishedAt)}</time>
                </div>
                <h2 className="mt-2.5 text-lg font-semibold leading-snug tracking-tight text-[#111827]">
                  {item.title}
                </h2>
                {item.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4B5563]">{item.excerpt}</p>
                ) : null}
                <p className="mt-3 text-[12px] font-medium text-[#00A88F]">Read on publisher site</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
