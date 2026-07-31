"use client";

import Header from "@/components/Header";
import RelatedToolsSection from "@/components/RelatedToolsSection";
import CustomToolOutlet from "@/components/tools/CustomToolOutlet";
import type { Tool } from "@/lib/tools-registry";

/** Custom tools only — no engines / tool-runner in this chunk. */
export default function CustomToolPageClient({
  slug,
  tool,
}: {
  slug: string;
  tool: Tool;
}) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full scroll-mt-20">
        <CustomToolOutlet slug={slug} tool={tool} />
        <RelatedToolsSection
          slug={slug}
          variant="cards"
          className="mt-10 border-t border-border pt-8 scroll-mt-24"
        />
      </main>
    </>
  );
}
