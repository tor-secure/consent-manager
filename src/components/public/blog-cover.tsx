import Image from "next/image";
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
      <Image
        src={post.cover}
        alt={post.imageAlt}
        fill
        sizes="(max-width: 800px) 100vw, 800px"
        className="object-cover"
      />
    </div>
  );
}
