export type NewsSource = {
  id: string;
  name: string;
  homepage: string;
  feeds: readonly string[];
};

export type NewsArticle = {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string | null;
};

export type NewsSourceStatus = {
  id: string;
  name: string;
  homepage: string;
  ok: boolean;
  count: number;
};

export function formatNewsTime(iso: string | null): string {
  if (!iso) return "Date unavailable";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export const NEWS_SOURCES: readonly NewsSource[] = [
  {
    id: "iapp",
    name: "IAPP",
    homepage: "https://iapp.org/news/",
    feeds: ["https://prod.iapp.org/rss/daily-dashboard/"],
  },
  {
    id: "techcrunch",
    name: "TechCrunch",
    homepage: "https://techcrunch.com/category/security/",
    feeds: ["https://techcrunch.com/category/security/feed/"],
  },
  {
    id: "thehackernews",
    name: "The Hacker News",
    homepage: "https://thehackernews.com/",
    feeds: ["https://feeds.feedburner.com/TheHackersNews"],
  },
  {
    id: "bleepingcomputer",
    name: "BleepingComputer",
    homepage: "https://www.bleepingcomputer.com/news/",
    feeds: ["https://www.bleepingcomputer.com/feed/"],
  },
  {
    id: "darkreading",
    name: "Dark Reading",
    homepage: "https://www.darkreading.com/",
    feeds: ["https://www.darkreading.com/rss.xml"],
  },
  {
    id: "securityweek",
    name: "SecurityWeek",
    homepage: "https://www.securityweek.com/",
    feeds: ["https://www.securityweek.com/feed/"],
  },
  {
    id: "cyberscoop",
    name: "CyberScoop",
    homepage: "https://cyberscoop.com/",
    feeds: ["https://cyberscoop.com/feed/"],
  },
  {
    id: "krebsonsecurity",
    name: "KrebsOnSecurity",
    homepage: "https://krebsonsecurity.com/",
    feeds: ["https://krebsonsecurity.com/feed/"],
  },
  {
    id: "scmedia",
    name: "SC Media",
    homepage: "https://www.scworld.com/",
    feeds: [
      "https://www.scworld.com/feed/",
      "https://news.google.com/rss/search?q=site:scworld.com&hl=en-US&gl=US&ceid=US:en",
    ],
  },
  {
    id: "privacyaffairs",
    name: "Privacy Affairs",
    homepage: "https://www.privacyaffairs.com/",
    feeds: [
      "https://www.privacyaffairs.com/feed/",
      "https://news.google.com/rss/search?q=site:privacyaffairs.com&hl=en-US&gl=US&ceid=US:en",
    ],
  },
] as const;
