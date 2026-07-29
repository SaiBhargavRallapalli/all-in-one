"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto flex flex-1 w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          That URL doesn&apos;t match a DevBench tool or page. Try search, or browse the full catalog.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Home
          </Link>
          <Link
            href="/#tools"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Browse tools
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("devbench:open-palette"))}
            className="inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Search ⌘K
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
