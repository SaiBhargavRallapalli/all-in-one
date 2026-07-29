import Link from "next/link";

const LINKS = [
  { href: "#main", label: "Tool" },
  { href: "#related-tools", label: "Related tools" },
  { href: "#tool-faq", label: "FAQ" },
  { href: "#tool-guide", label: "Guide" },
] as const;

/** In-page jump links for tool layouts. */
export default function ToolPageNav({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="On this page"
      className={`flex flex-wrap gap-2 text-xs ${className}`.trim()}
    >
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
