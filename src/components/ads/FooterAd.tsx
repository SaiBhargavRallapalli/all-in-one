// Copyright (c) 2026 DevBench contributors. MIT License.
"use client";

import { usePathname } from "next/navigation";
import AdSenseSlot from "@/components/ads/AdSenseSlot";

/**
 * Discrete tool-page ad above the footer. Skips home (dedicated home unit),
 * blog posts (in-article unit), and embed shells.
 */
export default function FooterAd() {
  const pathname = usePathname() ?? "";

  if (
    pathname === "/" ||
    pathname.startsWith("/blog/") ||
    pathname.startsWith("/embed")
  ) {
    return null;
  }

  return (
    <AdSenseSlot
      placement="tool"
      className="mx-auto mb-6 max-w-3xl border-b border-border pb-6"
    />
  );
}
