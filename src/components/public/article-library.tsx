"use client";

import { DirectionIcon } from "@/components/ui/direction-icon";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BlogCover } from "./blog-cover";
import { formatBlogDate, type BlogPost } from "@/content/blogs";

export function ArticleLibrary({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All topics");
  const reduce = useReducedMotion();
  const topics = useMemo(() => [...new Set(posts.map(post => post.category))], [posts]);
  const visible = posts.filter(post => (topic === "All topics" || post.category === topic) && `${post.title} ${post.excerpt} ${post.region}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="article-library">
    <div className="article-library-tools"><label><span className="sr-only">Search privacy articles</span><input type="search" placeholder="Find a topic, law, or question…" value={query} onChange={event => setQuery(event.target.value)} /></label><label><span className="sr-only">Article topic</span><select value={topic} onChange={event => setTopic(event.target.value)}><option>All topics</option>{topics.map(item => <option key={item}>{item}</option>)}</select></label><span aria-live="polite">{visible.length} articles</span></div>
    {!visible.length && <div className="article-library-empty"><h2>No articles match your search.</h2><p>Try another topic or return to the complete library.</p><button type="button" onClick={() => {setQuery("");setTopic("All topics");}}>Clear filters</button></div>}
    <div className="article-library-results">{visible.map((post, index) => <motion.article key={post.slug} layout={!reduce} transition={{duration: reduce ? 0 : .3}} className={index === 0 ? "article-library-featured" : ""}><Link href={`/blogs/${post.slug}`}><BlogCover post={post} /><div><div className="article-library-meta"><span>{post.category}</span><span>{post.region}</span></div><h2>{post.title}</h2><p>{post.excerpt}</p><div className="article-library-foot"><span>{formatBlogDate(post.publishedAt)} · {post.readMinutes} min read</span><DirectionIcon direction="diagonal" /></div></div></Link></motion.article>)}</div>
  </div>;
}
