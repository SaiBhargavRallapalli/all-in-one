import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Tag, ArrowRight, Wrench } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import AdSenseSlot from "@/components/ads/AdSenseSlot";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { POST_CONTENT } from "@/components/blog/PostContent";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    alternates: { canonical: `https://www.devbench.co.in/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://www.devbench.co.in/blog/${slug}`,
      siteName: "DevBench",
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      site: "@devbench",
      creator: "@devbench",
    },
  };
}

const TAG_COLORS: Record<string, string> = {
  identifiers: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  databases:   "bg-green-500/10 text-green-600 dark:text-green-400",
  javascript:  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  auth:        "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  security:    "bg-red-500/10 text-red-600 dark:text-red-400",
  jwt:         "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  web:         "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  urls:        "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  json:        "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  debugging:   "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  regex:       "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  reference:   "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  encoding:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  yaml:        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  config:      "bg-stone-500/10 text-stone-600 dark:text-stone-400",
  devtools:    "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post || !POST_CONTENT[slug]) notFound();

  const content = POST_CONTENT[slug];

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);
  const relatedPosts = (post.relatedBlogSlugs ?? [])
    .map((s) => BLOG_POSTS.find((p) => p.slug === s))
    .filter((p): p is (typeof BLOG_POSTS)[number] => p !== undefined);

  return (
    <>
      <Header />
      <JsonLd data={breadcrumbSchema([
        { name: "Blog", path: "/blog" },
        { name: post.title, path: `/blog/${slug}` },
      ])} />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
          {/* Back link */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All articles
          </Link>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] ?? "bg-muted text-muted-foreground"}`}
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-snug mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-10 pb-8 border-b border-border">
            <span>{formatDate(post.date)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {post.readMinutes} min read
            </span>
          </div>

          {/* Article body */}
          <div className="prose-container">
            {content}
          </div>

          <div className="my-10">
            <AdSenseSlot placement="blog" />
          </div>

          {/* Related tool CTA */}
          {post.relatedToolHref && (
            <div className="mt-12 p-5 rounded-xl border border-accent/30 bg-accent/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Try it yourself
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Use the free browser-based {post.relatedToolLabel} on DevBench — no signup, runs entirely in your browser.
              </p>
              <Link
                href={post.relatedToolHref}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Open {post.relatedToolLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </article>

        {/* Related articles — topically matched via relatedBlogSlugs */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-border bg-muted/20">
            <div className="max-w-3xl mx-auto px-4 py-10">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                Related articles
              </h2>
              <div className="flex flex-col gap-3">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-accent/50 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors leading-snug">
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {p.excerpt}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* More articles */}
        {otherPosts.length > 0 && (
          <section className="border-t border-border bg-muted/20">
            <div className="max-w-3xl mx-auto px-4 py-10">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                More articles
              </h2>
              <div className="flex flex-col gap-3">
                {otherPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-accent/50 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors leading-snug">
                        {p.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {p.excerpt}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-accent transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 mt-5 text-sm text-accent hover:underline font-medium"
              >
                View all articles <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* JSON-LD BlogPosting — Safe: JSON.stringify + < escape produces no executable content. lgtm[js/xss] */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ // CodeQL[js/xss]
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            url: `https://www.devbench.co.in/blog/${slug}`,
            datePublished: post.date,
            dateModified: post.date,
            author: {
              "@type": "Organization",
              name: "DevBench",
              url: "https://www.devbench.co.in",
            },
            publisher: {
              "@type": "Organization",
              name: "DevBench",
              url: "https://www.devbench.co.in",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://www.devbench.co.in/blog/${slug}`,
            },
          }).replace(/</g, "\\u003c"),
        }}
      />

      <Footer />
    </>
  );
}
