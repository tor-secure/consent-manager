import type { BlogPost } from "@/content/blogs";

export function BlogCover({
  post,
  className = "",
}: {
  post: Pick<BlogPost, "cover" | "imageAlt">;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[16/9] overflow-hidden bg-[#0B2C4A] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={post.cover} alt={post.imageAlt} className="h-full w-full object-cover" />
    </div>
  );
}
