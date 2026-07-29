import Link from "next/link";
import { Shield, Zap, Globe, Sparkles, ArrowRight } from "lucide-react";
import { TOOLS, getToolBySlug } from "@/lib/tools-registry";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FavoritesBar from "@/components/FavoritesBar";
import JsonLd from "@/components/JsonLd";
import { FOOTER_CATEGORY_ORDER } from "@/lib/site-navigation";
import { getCategoryHighlightTools } from "@/lib/category-navigation";
import { toolGroupSchema } from "@/lib/tool-structured-data";
import { websiteSchemaWithSearch } from "@/lib/site-organization-schema";
import { publicHrefForToolSlug } from "@/lib/devbench-workspaces";
import EngagementHome from "@/components/EngagementHomeLazy";

const homepageToolGroupsSchema = {
  "@context": "https://schema.org",
  "@graph": FOOTER_CATEGORY_ORDER.map((category) =>
    toolGroupSchema(category, getCategoryHighlightTools(category, 5)),
  ),
};

/**
 * Curated cross-category tools shown as clickable pills in the server-rendered
 * hero — gives Google diverse internal links from the most authoritative page.
 */
const FEATURED_TOOL_SLUGS = [
  "jwt-debugger",
  "password-generator",
  "merge-pdf",
  "regex-tester",
  "hash-generator",
  "loan-emi-calculator",
  "base64-encode",
  "uuid-generator",
] as const;

const featuredTools = FEATURED_TOOL_SLUGS.flatMap((slug) => {
  const t = getToolBySlug(slug);
  return t ? [t] : [];
});

const HOMEPAGE_FAQS = [
  {
    q: "What is DevBench?",
    a: `DevBench is a free collection of ${TOOLS.length}+ online developer tools — JSON formatter, JWT debugger, Base64 encoder/decoder, regex tester, PDF merger, UUID generator, password generator, EMI calculator, and more. Everything runs directly in your browser with no account required.`,
  },
  {
    q: "Is DevBench completely free?",
    a: "Yes. All tools on DevBench are free to use, forever. There are no paywalls, usage limits, or premium tiers.",
  },
  {
    q: "Does DevBench store or upload my data?",
    a: "Almost everything runs client-side in your browser — JSON, JWTs, passwords, most PDFs, and similar inputs never leave your device, and we do not store them. A few features need the network by design: API Tester and Webhook Simulator (via our CORS proxy), Notebook → PDF conversion, and the Go playground (which forwards code to go.dev). We do not keep those payloads after the response.",
  },
  {
    q: "Do I need to create an account?",
    a: "No signup, no email, no account. Open a tool and use it immediately — your last input is auto-saved in your browser's local storage so it's still there when you come back.",
  },
  {
    q: "What kinds of developer tools does DevBench include?",
    a: "DevBench covers JSON formatting and diffing, JWT debugging, Base64 and URL encoding, regex testing, UUID/ULID generation, hash generation (SHA-256, SHA-512), AES-256 encryption, PDF merging and splitting, text diffing, cron expression parsing, Unix timestamp conversion, QR code generation, finance calculators (EMI, GST, compound interest), health calculators (BMI, BMR), and much more.",
  },
  {
    q: "Can I use DevBench offline?",
    a: "Yes. DevBench is a Progressive Web App (PWA). After your first visit the app is cached by a service worker, so tools continue to work without an internet connection. You can also install it to your home screen or desktop for instant access.",
  },
] as const;

const WHY_DEVBENCH_FEATURES = [
  {
    icon: Shield,
    title: "Private on your device",
    desc: "Nothing is uploaded to our servers. What you paste stays in your browser.",
  },
  {
    icon: Zap,
    title: "Ready when you are",
    desc: "No account, no queue. Pick a tool and use it in one click.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Header />
      <FavoritesBar />
      <main id="main" className="flex-1">
        {/* Hero — focused: brand, one CTA path, popular tools — then jump to explorer */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-light),transparent_70%)] opacity-60" />
          <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-border bg-card text-sm text-muted-foreground">
              <Sparkles
                className="h-3.5 w-3.5 shrink-0 text-accent"
                strokeWidth={2}
                aria-hidden
              />
              <span className="leading-none">
                {TOOLS.length} free tools · no signup · runs in your browser
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 text-balance">
              Free Online{" "}
              <span className="text-accent">Developer Tools</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Decode JWTs, merge PDFs, convert images, test regex, generate UUIDs, and more —
              all in your browser. Free, no install.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <a
                href="#tools"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Browse all free in-browser tools"
              >
                Browse all {TOOLS.length} tools
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </a>
              <Link
                href="/json"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Open the JSON toolkit — formatter, diff, converters and more"
              >
                JSON Toolkit
              </Link>
            </div>

            <p className="mb-6 text-xs text-muted-foreground">
              Tip: press{" "}
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
                ⌘K
              </kbd>{" "}
              or{" "}
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
                Ctrl+K
              </kbd>{" "}
              anytime to search tools
            </p>

            {/* Popular tools strip — server-rendered so Google sees diverse tool links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Popular tools
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {featuredTools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={publicHrefForToolSlug(tool.slug)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted hover:border-accent/50 transition-colors"
                    title={tool.description}
                  >
                    <span
                      className="font-mono text-[10px] opacity-50 leading-none"
                      aria-hidden
                    >
                      {tool.icon}
                    </span>
                    {tool.shortName}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <EngagementHome />

        {/* Supporting content after tool discovery */}
        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16 space-y-12 text-left md:text-center">
            <section aria-labelledby="why-devbench-heading">
              <h2
                id="why-devbench-heading"
                className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
              >
                Why DevBench
              </h2>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {WHY_DEVBENCH_FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex flex-row md:flex-col md:items-center gap-3 md:gap-4 rounded-2xl border border-border/70 bg-card/50 px-4 py-5 md:text-center shadow-sm shadow-black/[0.03]"
                  >
                    <div className="shrink-0 rounded-xl bg-accent/10 p-2.5 md:p-3">
                      <f.icon className="h-5 w-5 text-accent md:h-6 md:w-6" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 md:flex-none">
                      <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:mx-auto md:max-w-[18rem]">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex flex-row md:flex-col md:items-center gap-3 md:gap-4 rounded-2xl border border-border/70 bg-card/50 px-4 py-5 md:text-center shadow-sm shadow-black/[0.03]">
                  <div className="shrink-0 rounded-xl bg-accent/10 p-2.5 md:p-3">
                    <Globe className="h-5 w-5 text-accent md:h-6 md:w-6" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 md:flex-none">
                    <h3 className="text-sm font-semibold text-foreground">
                      {TOOLS.length}+ tools in one place
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground md:mx-auto md:max-w-[18rem]">
                      From JSON and PDFs to money, health, and date helpers — free forever.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="faq-heading" className="text-left">
              <h2
                id="faq-heading"
                className="text-lg font-semibold tracking-tight text-foreground sm:text-xl mb-5"
              >
                Frequently asked questions
              </h2>
              <dl className="space-y-4">
                {HOMEPAGE_FAQS.map((faq) => (
                  <div key={faq.q} className="rounded-2xl border border-border/70 bg-card/50 px-5 py-4 shadow-sm shadow-black/[0.03]">
                    <dt className="text-sm font-semibold text-foreground">{faq.q}</dt>
                    <dd className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </section>
      </main>
      <Footer />

      <JsonLd data={websiteSchemaWithSearch()} />
      <JsonLd data={homepageToolGroupsSchema} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: HOMEPAGE_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      }} />
    </>
  );
}
