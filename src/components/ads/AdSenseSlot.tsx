// Copyright (c) 2026 DevBench contributors. MIT License.
"use client";

import { useEffect, useRef } from "react";
import {
  ADSENSE_CLIENT,
  getAdSlot,
  type AdPlacement,
} from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSenseSlotProps = {
  placement: AdPlacement;
  className?: string;
};

/**
 * Responsive AdSense display unit. Pushes to `adsbygoogle` once mounted.
 * When the placement's slot env var is unset, renders nothing (Auto Ads from
 * the layout client script can still run independently).
 */
export default function AdSenseSlot({ placement, className }: AdSenseSlotProps) {
  const slot = getAdSlot(placement);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot || pushedRef.current) return;
    try {
      const ads = window.adsbygoogle ?? [];
      window.adsbygoogle = ads;
      ads.push({});
      pushedRef.current = true;
    } catch {
      // Ad blockers or a missing script should not break the page.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <aside
      className={["w-full", className].filter(Boolean).join(" ")}
      aria-label="Advertisement"
      data-ad-placement={placement}
    >
      <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Advertisement
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
