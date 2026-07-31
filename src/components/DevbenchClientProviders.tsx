// Copyright (c) 2026 DevBench contributors. MIT License.
"use client";

import dynamic from "next/dynamic";
import { useDevbenchShortcuts } from "@/hooks/use-devbench-shortcuts";

const PwaInstallPrompt = dynamic(() => import("@/components/PwaInstallPrompt"), {
  ssr: false,
});
const PortholePromo = dynamic(() => import("@/components/PortholePromo"), {
  ssr: false,
});

/** Client-only globals: keyboard shortcuts, deferred PWA / promo chrome. */
export default function DevbenchClientProviders({ children }: { children: React.ReactNode }) {
  useDevbenchShortcuts();
  return (
    <>
      {children}
      <PwaInstallPrompt />
      <PortholePromo />
    </>
  );
}
