// Copyright (c) 2026 DevBench contributors. MIT License.
import { describe, expect, it } from "vitest";
import {
  ADSENSE_CLIENT,
  getAdSlot,
  hasAnyAdSlotConfigured,
  SLOT_ENV_KEYS,
  type AdPlacement,
} from "@/lib/adsense";

describe("adsense config", () => {
  it("exposes the DevBench publisher client ID", () => {
    expect(ADSENSE_CLIENT).toBe("ca-pub-6450653669194686");
  });

  it("documents the public slot env keys", () => {
    expect(SLOT_ENV_KEYS.home).toBe("NEXT_PUBLIC_ADSENSE_SLOT_HOME");
    expect(SLOT_ENV_KEYS.tool).toBe("NEXT_PUBLIC_ADSENSE_SLOT_TOOL");
    expect(SLOT_ENV_KEYS.blog).toBe("NEXT_PUBLIC_ADSENSE_SLOT_BLOG");
  });

  it("returns null for unset slots in the default test env", () => {
    const placements: AdPlacement[] = ["home", "tool", "blog"];
    for (const placement of placements) {
      expect(getAdSlot(placement)).toBeNull();
    }
    expect(hasAnyAdSlotConfigured()).toBe(false);
  });
});
