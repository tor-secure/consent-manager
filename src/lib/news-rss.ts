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

function safeHttpUrl(raw: string | null | undefined, base?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(decodeXmlEntities(raw).trim(), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function imageFromAttrs(attrs: string): string | null {
  const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
  const medium = attrs.match(/\bmedium=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
  if (type.startsWith("video") || type.startsWith("audio") || medium === "video" || medium === "audio") {
    return null;
  }
  if (type && !type.startsWith("image/")) return null;
  return safeHttpUrl(attrs.match(/\b(?:url|href)=["']([^"']+)["']/i)?.[1]);
}

function imageFromHtml(html: string, base: string): string | null {
  const images = [...html.matchAll(/<img\b([^>]*?)>/gi)];
  for (const match of images) {
    const attrs = match[1] ?? "";
    const raw =
      attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
      attrs.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
    const url = safeHttpUrl(raw, base);
    if (!url) continue;
    if (/pixel|spacer|1x1|tracking|doubleclick|facebook\.com\/tr|feeds\.feedburner/i.test(url)) continue;
    const width = Number(attrs.match(/\bwidth=["'](\d+)["']/i)?.[1] ?? 0);
    if (width > 0 && width < 40) continue;
    return url;
  }
  return null;
}

function imageFromBlock(block: string, pageUrl: string): string | null {
  let best: { url: string; width: number } | null = null;
  for (const match of block.matchAll(/<media:(?:content|thumbnail)\b([^>]*?)\/?>/gi)) {
    const attrs = match[1] ?? "";
    const url = imageFromAttrs(attrs);
    if (!url) continue;
    const declaredWidth = Number(attrs.match(/\bwidth=["'](\d+)["']/i)?.[1] ?? 0);
    const width = declaredWidth || (match[0].toLowerCase().startsWith("<media:thumbnail") ? 1 : 200);
    if (!best || width > best.width) best = { url, width };
  }
  if (best) return best.url;

  for (const match of block.matchAll(/<(?:enclosure|itunes:image)\b([^>]*?)\/?>/gi)) {
    const url = imageFromAttrs(match[1] ?? "");
    if (url) return url;
  }

  const html = decodeXmlEntities(
    innerTag(block, "content:encoded") ??
      innerTag(block, "description") ??
      innerTag(block, "summary") ??
      innerTag(block, "content") ??
      "",
  );
  return imageFromHtml(html, pageUrl);
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
      imageUrl: imageFromBlock(block, url),
      publishedAt: publishedFromBlock(block),
    });

    if (articles.length >= MAX_ITEMS_PER_SOURCE) break;
  }

  return articles;
}

function metaImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta\b[^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi,
    /<meta\b[^>]*content=["'][^"']+["'][^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const tag = match[0];
      const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1];
      const url = safeHttpUrl(content, pageUrl);
      if (url) return url;
    }
  }
  return null;
}

async function pageImage(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(4_000),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 150_000);
    return metaImage(html, pageUrl);
  } catch {
    return null;
  }
}

async function fillMissingImages(articles: NewsArticle[]): Promise<void> {
  const missing = articles.filter((article) => !article.imageUrl);
  let cursor = 0;
  async function worker() {
    while (cursor < missing.length) {
      const article = missing[cursor];
      cursor += 1;
      article.imageUrl = await pageImage(article.url);
    }
  }
  const workers = Math.min(6, missing.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
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

  const visible = articles.slice(0, MAX_FEED_ITEMS);
  await fillMissingImages(visible);

  return {
    articles: visible,
    sources,
    fetchedAt: new Date().toISOString(),
  };
}
