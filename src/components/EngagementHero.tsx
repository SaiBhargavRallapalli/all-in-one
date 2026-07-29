"use client";

import Link from "next/link";
import {
  Braces,
  Code2,
  Type,
  Wrench,
  Sparkles,
  ArrowRightLeft,
  DollarSign,
  Heart,
  Sigma,
  CalendarDays,
  FileStack,
  Star,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import {
  CATEGORIES,
  getToolsByCategory,
  type ToolCategory,
} from "@/lib/tools-registry";
import { publicHrefForToolSlug } from "@/lib/devbench-workspaces";
import { getSpotlightTool } from "@/lib/engagement-spotlight";
import { categoryBrowseHref } from "@/lib/category-navigation";
import { toggleFavorite, getFavoriteSlugs } from "@/lib/devbench-preferences";
import { useState, useEffect } from "react";

const CATEGORY_ICONS: Record<ToolCategory, React.ElementType> = {
  json: Braces,
  encoding: Code2,
  text: Type,
  dev: Wrench,
  image: Sparkles,
  pdf: FileStack,
  conversion: ArrowRightLeft,
  finance: DollarSign,
  health: Heart,
  math: Sigma,
  datetime: CalendarDays,
};

function CategoryTile({
  category,
  count,
}: {
  category: ToolCategory;
  count: number;
}) {
  const Icon = CATEGORY_ICONS[category];
  const meta = CATEGORIES[category];

  return (
    <Link
      href={categoryBrowseHref(category)}
      className="group block rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${meta.color} transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{count} tools</p>
    </Link>
  );
}

function SaveQuickAction({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Use a named function so setState isn't called directly in the effect body
    // (react-hooks/set-state-in-effect).
    const sync = () => setSaved(getFavoriteSlugs().includes(slug));
    sync();
    window.addEventListener("devbench:prefs-changed", sync);
    return () => window.removeEventListener("devbench:prefs-changed", sync);
  }, [slug]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggleFavorite(slug);
        setSaved(getFavoriteSlugs().includes(slug));
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Star className={`h-3.5 w-3.5 ${saved ? "fill-amber-500 text-amber-500" : ""}`} aria-hidden />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export default function EngagementHero() {
  const spotlight = getSpotlightTool();

  if (!spotlight) return null;

  return (
    <section
      aria-labelledby="explore-heading"
      className="border-b border-border bg-muted/20"
    >
      <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
        <header className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
            Start here
          </p>
          <h2
            id="explore-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          >
            Jump into a popular tool or browse by category
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Open a tool in one click, or pick a category to see everything in that group.
          </p>
        </header>

        <article className="mb-12 relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-6 sm:p-8 shadow-sm">
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            <TrendingUp className="h-3 w-3" aria-hidden />
            Popular
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div
              className={`shrink-0 flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold font-mono ${CATEGORIES[spotlight.category].color}`}
            >
              {spotlight.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-foreground">{spotlight.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl">
                {spotlight.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={publicHrefForToolSlug(spotlight.slug)}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open tool
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#tools"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse all tools
                </a>
                <SaveQuickAction slug={spotlight.slug} />
              </div>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {(Object.keys(CATEGORIES) as ToolCategory[]).map((cat) => (
            <CategoryTile
              key={cat}
              category={cat}
              count={getToolsByCategory(cat).length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
