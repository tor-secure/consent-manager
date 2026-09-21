import "server-only";

import {
  NEWS_SOURCES,
  type NewsArticle,
  type NewsSource,
  type NewsSourceStatus,
} from "@/content/news-sources";

export type { NewsArticle, NewsSourceStatus };

export type NewsFeedResult = {
  articles: NewsArticle[];
  sources: NewsSourceStatus[];
  fetchedAt: string;
};

const FETCH_TIMEOUT_MS = 8_000;
const REVALIDATE_SECONDS = 600;
const MAX_ITEMS_PER_SOURCE = 18;
const MAX_FEED_ITEMS = 90;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ConsentGuruNewsBot/1.0; +https://consentguru.com/news)";

function unwrapCdata(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decodeXmlEntities(value: string): string {
  return unwrapCdata(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripHtml(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function innerTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? unwrapCdata(match[1]) : null;
}

function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(decodeXmlEntities(raw).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function linkFromBlock(block: string): string | null {
  const links = [...block.matchAll(/<link([^>]*)(?:\/\s*>|>([\s\S]*?)<\/link>)/gi)];
  let fallback: string | null = null;
  for (const match of links) {
    const attrs = match[1] ?? "";
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const body = match[2] ? unwrapCdata(match[2]).trim() : "";
    const candidate = safeHttpUrl(href) ?? safeHttpUrl(body);
    if (!candidate) continue;
    if (rel.includes("alternate") || !rel) return candidate;
    fallback ??= candidate;
  }
  return fallback ?? safeHttpUrl(innerTag(block, "guid")) ?? safeHttpUrl(innerTag(block, "id"));
}

function originalUrlFromGoogleNews(block: string, fallback: string): string {
  const sourceUrl = block.match(/<source[^>]*\burl=["']([^"']+)["']/i)?.[1];
  const description = innerTag(block, "description") ?? "";
  const decoded = decodeXmlEntities(description);
  const hrefs = [...decoded.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((match) =>
    safeHttpUrl(match[1]),
  );
  const nonGoogle = hrefs.find((url) => url && !url.includes("news.google.com"));
  if (nonGoogle) return nonGoogle;
  if (sourceUrl && !fallback.includes("news.google.com")) return fallback;
  return fallback;
}

function publishedFromBlock(block: string): string | null {
  const raw =
    innerTag(block, "pubDate") ??
    innerTag(block, "published") ??
    innerTag(block, "updated") ??
    innerTag(block, "dc:date");
  if (!raw) return null;
  const parsed = Date.parse(decodeXmlEntities(raw));
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normalizePublisherUrl(url: string, sourceId: string): string {
  try {
    const parsed = new URL(url);
    if (sourceId === "iapp" && parsed.hostname === "prod.iapp.org") {
      parsed.hostname = "iapp.org";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function parseFeedXml(xml: string, source: NewsSource): NewsArticle[] {
  if (!/<rss[\s>]|<feed[\s>]/i.test(xml)) return [];
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi),
  ].map((match) => match[0]);

  const articles: NewsArticle[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const title = stripHtml(innerTag(block, "title") ?? "");
    if (!title || title.toLowerCase() === "google news") continue;
    const rawLink = linkFromBlock(block);
    if (!rawLink) continue;
    const googleUnwrapped = originalUrlFromGoogleNews(block, rawLink);
    const url = normalizePublisherUrl(googleUnwrapped, source.id);
    if (seen.has(url)) continue;
    seen.add(url);

    const excerpt = stripHtml(
      innerTag(block, "description") ??
        innerTag(block, "summary") ??
        innerTag(block, "content:encoded") ??
        innerTag(block, "content") ??
        "",
    ).slice(0, 280);

    articles.push({
      id: `${source.id}:${url}`,
      sourceId: source.id,
      sourceName: source.name,
      title: title.replace(/\s+[-–—]\s+(SC Media|Privacy Affairs|IAPP|Google News)\s*$/i, ""),
      excerpt,
      url,
      publishedAt: publishedFromBlock(block),
    });

    if (articles.length >= MAX_ITEMS_PER_SOURCE) break;
  }

  return articles;
}

async function fetchXml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length < 80 || text.length > 2_000_000) return null;
    return text;
  } catch {
    return null;
  }
}

async function loadSource(source: NewsSource): Promise<{ articles: NewsArticle[]; ok: boolean }> {
  for (const feed of source.feeds) {
    const xml = await fetchXml(feed);
    if (!xml) continue;
    const articles = parseFeedXml(xml, source);
    if (articles.length > 0) return { articles, ok: true };
  }
  return { articles: [], ok: false };
}

export async function getNewsFeed(): Promise<NewsFeedResult> {
  const settled = await Promise.all(NEWS_SOURCES.map((source) => loadSource(source)));
  const articles: NewsArticle[] = [];
  const sources: NewsSourceStatus[] = NEWS_SOURCES.map((source, index) => {
    const result = settled[index];
    articles.push(...result.articles);
    return {
      id: source.id,
      name: source.name,
      homepage: source.homepage,
      ok: result.ok,
      count: result.articles.length,
    };
  });

  articles.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });

  return {
    articles: articles.slice(0, MAX_FEED_ITEMS),
    sources,
    fetchedAt: new Date().toISOString(),
  };
}
