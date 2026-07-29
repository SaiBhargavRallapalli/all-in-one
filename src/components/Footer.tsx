// Copyright (c) 2026 DevBench contributors. MIT License.
import Link from "next/link";
import { Shield, ExternalLink } from "lucide-react";
import DevBenchMark from "@/components/DevBenchMark";
import {
  footerCategoryLinks,
  getPopularTools,
  toolNavHref,
} from "@/lib/site-navigation";
import { relatedToolLinkLabel } from "@/lib/related-tools";

export default function Footer() {
  const popularTools = getPopularTools();
  const categoryLinks = footerCategoryLinks();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        <div className="mb-6 pb-6 border-b border-border grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
              Explore by category
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label} tools
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
              Popular tools
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {popularTools.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={toolNavHref(tool.slug)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {relatedToolLinkLabel(tool)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-6 pb-6 border-b border-border">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center sm:text-left">
            Also from DevBench
          </p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <a
              href="https://porthole.devbench.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-accent/40 bg-accent/5 text-xs font-semibold text-foreground hover:bg-accent/10 transition-colors"
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-500 text-[9px] font-bold text-white">P</span>
              Porthole
              <span className="text-[9px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">New</span>
            </a>
            {[
              { name: "Bank Tools", href: "https://bank.devbench.co.in", initial: "B", color: "bg-emerald-500" },
              { name: "Form 16", href: "https://form16.devbench.co.in", initial: "F", color: "bg-orange-500" },
              { name: "ITR Helper", href: "https://itr.devbench.co.in", initial: "I", color: "bg-blue-500" },
              { name: "Resume", href: "https://resume.devbench.co.in", initial: "R", color: "bg-purple-500" },
              { name: "Receipts", href: "https://receipts.devbench.co.in", initial: "Rc", color: "bg-rose-500" },
            ].map((app) => (
              <a
                key={app.href}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded ${app.color} text-[9px] font-bold text-white`}>{app.initial}</span>
                {app.name}
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Link href="/" className="flex items-center gap-2 text-foreground">
              <DevBenchMark aria-hidden="true" className="h-6 w-6 text-accent" />
              <span className="font-bold tracking-tight">DevBench</span>
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              No login required — your work stays in your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link
              href="/blog"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              href="/changelog"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Changelog
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <a
              href="https://github.com/saibhargavrallapalli/devbench/issues/new?template=tool-request.md&title=Tool+request%3A+"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1"
            >
              Request a tool
              <ExternalLink aria-hidden="true" className="h-3 w-3 opacity-50" />
            </a>
            <a
              href="https://github.com/saibhargavrallapalli/devbench/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1"
            >
              Raise an issue
              <ExternalLink aria-hidden="true" className="h-3 w-3 opacity-50" />
            </a>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DevBench. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
