"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Tool } from "@/lib/tools-registry";

/** Fields the palette needs — omit unused Tool fields from the root RSC payload. */
export type PaletteTool = Pick<
  Tool,
  "slug" | "name" | "shortName" | "description" | "category" | "icon"
>;

type PaletteComponent = ComponentType<{ tools: PaletteTool[] }>;

/**
 * Do not mount CommandPalette until the first ⌘K / open event.
 * Avoids downloading the palette chunk on every page load.
 */
export default function LazyCommandPalette({ tools }: { tools: PaletteTool[] }) {
  const [Palette, setPalette] = useState<PaletteComponent | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPalette() {
      const mod = await import("@/components/CommandPalette");
      if (!cancelled) setPalette(() => mod.default);
    }

    function requestOpen() {
      setPendingOpen(true);
      void loadPalette();
    }

    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "k") return;
      if (!Palette) {
        e.preventDefault();
        e.stopPropagation();
        requestOpen();
      }
    }

    function onOpenEvent() {
      requestOpen();
    }

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("devbench:open-palette", onOpenEvent);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("devbench:open-palette", onOpenEvent);
    };
  }, [Palette]);

  useEffect(() => {
    if (!Palette || !pendingOpen) return;
    window.dispatchEvent(new Event("devbench:open-palette"));
    setPendingOpen(false);
  }, [Palette, pendingOpen]);

  if (!Palette) return null;
  return <Palette tools={tools} />;
}
