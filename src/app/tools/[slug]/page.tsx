import Link from "next/link";
import { getToolBySlug } from "@/lib/tools-registry";
import { TOOL_PAGE_CONTENT } from "@/lib/tool-page-content";
import { CUSTOM_TOOL_SLUGS } from "@/lib/custom-tool-slugs";
import Header from "@/components/Header";
import CustomToolPageClient from "@/components/tools/CustomToolPageClient";
import GenericToolPageClient from "@/components/tools/GenericToolPageClient";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return (
      <>
        <Header />
        <main id="main" className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Tool Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The tool &quot;{slug}&quot; doesn&apos;t exist.
            </p>
            <Link href="/" className="text-accent hover:underline">
              ← Back to tools
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (CUSTOM_TOOL_SLUGS.has(slug)) {
    return <CustomToolPageClient slug={slug} tool={tool} />;
  }

  const openingParagraph =
    TOOL_PAGE_CONTENT[slug]?.openingParagraph ?? tool.description;

  return (
    <GenericToolPageClient
      slug={slug}
      tool={tool}
      openingParagraph={openingParagraph}
    />
  );
}
