import type { BlogPost } from "@/content/blogs";

const palettes = [
  { bg: "#0B2C4A", fg: "#FFFFFF", accent: "#00C4A7" },
  { bg: "#083344", fg: "#ECFEFF", accent: "#22D3EE" },
  { bg: "#14532D", fg: "#ECFDF5", accent: "#34D399" },
  { bg: "#1E1B4B", fg: "#F5F3FF", accent: "#A78BFA" },
  { bg: "#7F1D1D", fg: "#FEF2F2", accent: "#FCA5A5" },
  { bg: "#134E4A", fg: "#F0FDFA", accent: "#2DD4BF" },
  { bg: "#1E3A8A", fg: "#EFF6FF", accent: "#93C5FD" },
  { bg: "#3F1D38", fg: "#FDF2F8", accent: "#F9A8D4" },
];

function paletteFor(slug: string) {
  let hash = 0;
  for (const char of slug) hash = (hash + char.charCodeAt(0) * 17) % palettes.length;
  return palettes[hash] ?? palettes[0];
}

export function BlogCover({
  post,
  className = "",
}: {
  post: Pick<BlogPost, "slug" | "category" | "region" | "title">;
  className?: string;
}) {
  const palette = paletteFor(post.slug);

  return (
    <div
      className={`relative flex aspect-[16/9] flex-col justify-between overflow-hidden p-4 sm:p-5 ${className}`}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em]">
        <span
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: palette.accent, color: palette.bg }}
        >
          {post.category}
        </span>
        <span className="opacity-80">{post.region}</span>
      </div>
      <div>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="mb-3 opacity-90">
          <rect x="4" y="5" width="16" height="14" rx="2" stroke={palette.accent} strokeWidth="1.7" />
          <path d="M8 9h8M8 12h5" stroke={palette.fg} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <p className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{post.title}</p>
      </div>
    </div>
  );
}
