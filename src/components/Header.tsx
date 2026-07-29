// Copyright (c) 2026 DevBench contributors. MIT License.
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Moon, Menu, X, Search, Wrench, LayoutGrid } from "lucide-react";
import DevBenchMark from "@/components/DevBenchMark";
import { useExternalNavOrigin } from "@/hooks/use-external-nav-origin";
import { resolveToolHref } from "@/lib/site-config";
import {
  HEADER_NAV_LINKS,
  SIDE_NAV_GROUPS,
  SIDE_NAV_LINKS,
} from "@/lib/header-navigation";

export default function Header() {
  const [dark, setDark]           = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const { origin: navOrigin, homePath } = useExternalNavOrigin();

  useEffect(() => {
    // Read initial theme through a helper so setState isn't called directly in
    // the effect body (react-hooks/set-state-in-effect).
    function syncTheme() { setDark(document.documentElement.classList.contains("dark")); }
    syncTheme();

    function onStorage(e: StorageEvent) {
      if (e.key !== "theme") return;
      const root = document.documentElement;
      const t = localStorage.getItem("theme");
      if (t === "dark") {
        root.classList.add("dark"); root.classList.remove("light"); setDark(true);
      } else if (t === "light") {
        root.classList.remove("dark"); root.classList.add("light"); setDark(false);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark); root.classList.remove("light"); setDark(prefersDark);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (sideNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sideNavOpen]);

  function toggleTheme() {
    const root = document.documentElement;
    const next = !dark;
    setDark(next);
    if (next) { root.classList.add("dark"); root.classList.remove("light"); }
    else { root.classList.remove("dark"); root.classList.add("light"); }
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function handleOpenTool() {
    const el = document.getElementById("tools");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#tools";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full shrink-0 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-13 max-w-screen-2xl items-center gap-1 px-4">

          {/* Logo */}
          <Link
            href={resolveToolHref("/", navOrigin, homePath)}
            className="flex shrink-0 items-center gap-2 text-foreground hover:text-accent transition-colors mr-2"
          >
            <DevBenchMark className="h-6 w-6 shrink-0 text-accent" />
            <span className="text-base font-bold tracking-tight">DevBench</span>
          </Link>

          {/* Primary nav — all links, compact */}
          <nav className="hidden flex-1 min-w-0 lg:flex items-center overflow-x-auto scrollbar-none" aria-label="Main navigation">
            <ul className="flex items-center flex-nowrap">
              {HEADER_NAV_LINKS.map((link) => (
                <li key={link.href} className="shrink-0">
                  <Link
                    href={resolveToolHref(link.href, navOrigin, homePath)}
                    aria-label={link.ariaLabel}
                    className="block rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground whitespace-nowrap"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <button
              type="button"
              onClick={handleOpenTool}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Jump to the tool browser and search for any tool"
            >
              <Wrench className="h-4 w-4 shrink-0" aria-hidden />
              Open a Tool
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("devbench:open-palette"))}
              aria-label="Search tools — open command palette"
              className="inline-flex items-center justify-center h-8 w-8 sm:w-auto sm:gap-1.5 sm:px-3 rounded-lg border border-border text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Search</span>
              <kbd aria-label="keyboard shortcut Command K" className="hidden sm:inline text-[10px] font-mono text-muted-foreground">⌘K</kbd>
            </button>

            {/* Side nav toggle */}
            <button
              type="button"
              onClick={() => setSideNavOpen(true)}
              aria-label="Open all navigation"
              title="All tools"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LayoutGrid aria-hidden="true" className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              suppressHydrationWarning
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={dark}
            >
              {dark ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
            </button>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen ? "true" : "false"}
              aria-haspopup="true"
              aria-controls="mobile-nav"
            >
              {menuOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Menu aria-hidden="true" className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen ? (
          <nav
            id="mobile-nav"
            className="border-t border-border bg-background px-4 pb-3 pt-2 lg:hidden"
            aria-label="Main navigation"
          >
            <button
              type="button"
              onClick={() => { handleOpenTool(); setMenuOpen(false); }}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
              Open a Tool
            </button>
            <ul className="grid grid-cols-3 gap-1">
              {HEADER_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={resolveToolHref(link.href, navOrigin, homePath)}
                    aria-label={link.ariaLabel}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Side nav drawer */}
      {sideNavOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setSideNavOpen(false)}
          />
          {/* Panel */}
          <aside
            className="fixed right-0 top-0 z-50 h-full w-72 max-w-[85vw] bg-background border-l border-border shadow-2xl flex flex-col"
            aria-label="All tools navigation"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <DevBenchMark className="h-4 w-4 text-accent" aria-hidden />
                <span className="text-sm font-semibold text-foreground">All Tools</span>
              </div>
              <button
                type="button"
                onClick={() => setSideNavOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="All tools">
              <button
                type="button"
                onClick={() => {
                  setSideNavOpen(false);
                  window.dispatchEvent(new Event("devbench:open-palette"));
                }}
                className="mb-3 flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                Search all tools
                <kbd className="ml-auto text-[10px] font-mono opacity-70">⌘K</kbd>
              </button>
              {SIDE_NAV_GROUPS.map((group) => {
                const links = SIDE_NAV_LINKS.filter((l) => l.group === group);
                return (
                  <div key={group} className="mb-4 last:mb-0">
                    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </p>
                    <ul className="space-y-0.5">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={resolveToolHref(link.href, navOrigin, homePath)}
                            aria-label={link.ariaLabel}
                            onClick={() => setSideNavOpen(false)}
                            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <Link
                href="/#tools"
                onClick={() => setSideNavOpen(false)}
                className="mt-1 flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                Browse all tools →
              </Link>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
