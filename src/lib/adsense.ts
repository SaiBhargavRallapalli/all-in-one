// Copyright (c) 2026 DevBench contributors. MIT License.

/** Google AdSense publisher client ID (also loaded via layout Script). */
export const ADSENSE_CLIENT = "ca-pub-6450653669194686";

/**
 * Named placements mapped to optional `NEXT_PUBLIC_ADSENSE_SLOT_*` env vars.
 * When a slot ID is missing, `AdSenseSlot` renders nothing; Auto Ads from the
 * site-wide client script can still serve inventory once enabled in AdSense.
 *
 * Slot values must be read via static `process.env.NEXT_PUBLIC_*` access so
 * Next.js can inline them into the client bundle at build time.
 */
export type AdPlacement = "home" | "tool" | "blog";

function normalizeSlot(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const SLOTS: Record<AdPlacement, string | null> = {
  home: normalizeSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME),
  tool: normalizeSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL),
  blog: normalizeSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_BLOG),
};

/** Env var names (documentation / tests). */
export const SLOT_ENV_KEYS: Record<AdPlacement, string> = {
  home: "NEXT_PUBLIC_ADSENSE_SLOT_HOME",
  tool: "NEXT_PUBLIC_ADSENSE_SLOT_TOOL",
  blog: "NEXT_PUBLIC_ADSENSE_SLOT_BLOG",
};

/** Returns the AdSense ad-unit slot ID for a placement, or null if unset. */
export function getAdSlot(placement: AdPlacement): string | null {
  return SLOTS[placement];
}

/** True when at least one display slot env var is configured. */
export function hasAnyAdSlotConfigured(): boolean {
  return (Object.keys(SLOTS) as AdPlacement[]).some(
    (placement) => SLOTS[placement] !== null,
  );
}
