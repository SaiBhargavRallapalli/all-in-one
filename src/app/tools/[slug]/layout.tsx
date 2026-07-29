import type { Metadata } from "next";
import { getToolBySlug, TOOLS } from "@/lib/tools-registry";
import { TOOL_FAQS } from "@/lib/tool-faqs";
import { TOOL_PAGE_CONTENT } from "@/lib/tool-page-content";
import ToolSeoContent from "@/components/tools/ToolSeoContent";
import ToolFaqSection from "@/components/tools/ToolFaqSection";
import TrackToolVisit from "@/components/TrackToolVisit";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import CategoryBrowseMore from "@/components/CategoryBrowseMore";
import { socialMetadata, SITE_URL } from "@/lib/social-metadata";
import { webApplicationEnrichment, toolScreenshotUrl } from "@/lib/web-application-schema";
import { breadcrumbSchema } from "@/lib/breadcrumb-schema";
import { faqPageGraphNode } from "@/lib/schema-helpers";
import { categoryBrowseHref, categoryLabel } from "@/lib/category-navigation";
import { toolPageStructuredGraph } from "@/lib/tool-structured-data";
import {
  publicHrefForToolSlug,
  TOOL_SLUG_TO_WORKSPACE,
} from "@/lib/devbench-workspaces";

export function generateStaticParams() {
  // Workspace-backed tools redirect away from /tools/[slug] — skip static shells.
  return TOOLS.filter((tool) => !(tool.slug in TOOL_SLUG_TO_WORKSPACE)).map(
    (tool) => ({ slug: tool.slug }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return { title: "Tool" };
  }
  const extra = TOOL_PAGE_CONTENT[slug];
  const title = extra?.title ?? `${tool.name} — Free Online Tool`;
  const description = extra?.metaDescription ??
    `${tool.description} Runs entirely in your browser — no signup, no uploads, client-side only.`;
  const canonicalPath = publicHrefForToolSlug(tool.slug);
  const ogImageUrl = `${SITE_URL}/tools/${tool.slug}/opengraph-image`;
  return {
    title,
    description,
    keywords: [tool.shortName, tool.name, "online tool", "free developer tools", "devbench"],
    alternates: { canonical: `${SITE_URL}${canonicalPath}` },
    ...socialMetadata({
      title,
      description,
      canonicalPath,
      ogImageUrl,
      ogImageAlt: `${title} | DevBench`,
    }),
  };
}

export default async function ToolSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  const faqs = TOOL_FAQS[slug] ?? [];
  const extra = tool ? TOOL_PAGE_CONTENT[slug] : undefined;
  const publicHref = tool ? publicHrefForToolSlug(tool.slug) : `/tools/${slug}`;

  const graph: object[] = [];

  if (tool) {
    const appDescription =
      extra?.metaDescription ??
      `${tool.description} Runs entirely in your browser — no uploads to a server.`;
    graph.push(
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}${publicHref}/#webapp`,
        name: tool.name,
        url: `${SITE_URL}${publicHref}`,
        description: appDescription,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        provider: {
          "@type": "Organization",
          name: "DevBench",
          url: SITE_URL,
        },
        ...webApplicationEnrichment({
          screenshotUrl: toolScreenshotUrl(slug),
          featureList: [
            tool.description,
            "Runs entirely in your browser — no uploads to a server",
            "Free to use — no account required",
            `${categoryLabel(tool.category)} tool on DevBench`,
          ],
        }),
      },
      ...toolPageStructuredGraph(tool, slug),
    );
  }

  const faqNode = faqPageGraphNode(faqs);
  if (faqNode) {
    graph.push(faqNode);
  }

  const jsonLd = graph.length > 0
    ? { "@context": "https://schema.org", "@graph": graph }
    : null;

  return (
    <>
      <TrackToolVisit slug={slug} />
      {jsonLd && <JsonLd data={jsonLd} />}
      {tool && (
        <JsonLd
          data={breadcrumbSchema([
            {
              name: categoryLabel(tool.category),
              path: categoryBrowseHref(tool.category),
            },
            { name: tool.name, path: publicHref },
          ])}
        />
      )}
      {children}
      {tool && (
        <div className="max-w-6xl mx-auto px-4 pb-6 w-full space-y-6 border-t border-border pt-8 mt-2">
          <CategoryBrowseMore
            category={tool.category}
            mode="next"
            afterSlug={slug}
            count={5}
          />
        </div>
      )}
      <ToolSeoContent slug={slug} />
      <ToolFaqSection slug={slug} />
      <Footer />
    </>
  );
}
