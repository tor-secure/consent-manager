import Image from "next/image";
import type { BlogPost } from "@/content/blogs";

export function BlogCover({
  post,
  className = "",
  priority = false,
}: {
  post: Pick<BlogPost, "cover" | "imageAlt">;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative aspect-[16/9] overflow-hidden bg-[#0B2C4A] ${className}`}>
      {post.cover.endsWith(".svg") ? (
        // Brand covers are SVG, which the image optimizer does not accept.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover} alt={post.imageAlt} className="h-full w-full object-cover" />
      ) : (
        <Image
          src={post.cover}
          alt={post.imageAlt}
          fill
          sizes="(max-width: 800px) 100vw, 800px"
          className="object-cover"
          priority={priority}
        />
      )}
    </div>
  );
}
