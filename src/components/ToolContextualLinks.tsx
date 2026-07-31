import Link from "next/link";
import { getRelatedTools, relatedToolLinkLabel } from "@/lib/related-tools";
import { publicHrefForToolSlug } from "@/lib/devbench-workspaces";

const TOOL_BLOG_LINKS: Record<string, { slug: string; title: string }[]> = {
  "jwt-debugger": [
    { slug: "jwt-explained", title: "JWT Explained: Header, Payload, and Signature" },
    { slug: "jwt-security-best-practices-10-things-developers-get-wrong", title: "10 JWT Security Mistakes Developers Make" },
    { slug: "jwt-decoder-without-uploading-to-server", title: "JWT Decoder Without Uploading to a Server" },
    {
      slug: "choosing-privacy-first-online-developer-tools",
      title: "Choosing privacy-first online developer tools",
    },
  ],
  "base64-encode": [
    { slug: "how-base64-encoding-works-and-when-not-to-use-it", title: "How Base64 Encoding Works (and When NOT to Use It)" },
  ],
  "base64-decode": [
    { slug: "how-base64-encoding-works-and-when-not-to-use-it", title: "How Base64 Encoding Works (and When NOT to Use It)" },
  ],
  "json-formatter": [
    { slug: "how-to-validate-json-online", title: "How to Validate JSON Online Safely" },
    { slug: "common-json-errors", title: "The 7 Most Common JSON Syntax Errors" },
  ],
  "json-diff": [
    { slug: "common-json-errors", title: "The 7 Most Common JSON Syntax Errors" },
  ],
  "yaml-formatter": [
    { slug: "yaml-vs-json-key-differences-with-real-examples", title: "YAML vs JSON — Key Differences with Real Examples" },
  ],
  "yaml-to-json": [
    { slug: "yaml-vs-json-key-differences-with-real-examples", title: "YAML vs JSON — Key Differences with Real Examples" },
  ],
  "json-to-yaml": [
    { slug: "yaml-vs-json-key-differences-with-real-examples", title: "YAML vs JSON — Key Differences with Real Examples" },
  ],
  "json-to-csv": [
    { slug: "json-to-csv", title: "JSON to CSV: How to Convert JSON Arrays to Spreadsheet Format" },
  ],
  "url-encode": [
    { slug: "encodeuricomponent-vs-encodeuri", title: "encodeURIComponent vs encodeURI Explained" },
  ],
  "url-decode": [
    { slug: "encodeuricomponent-vs-encodeuri", title: "encodeURIComponent vs encodeURI Explained" },
  ],
  "uuid-generator": [
    { slug: "uuid-vs-ulid-vs-nanoid", title: "UUID vs ULID vs Nano ID: Which Should You Use?" },
  ],
  "password-generator": [
    { slug: "how-to-generate-secure-passwords", title: "How to Generate Secure Passwords: A Developer's Guide" },
  ],
  "hash-generator": [
    { slug: "sha256-vs-md5-hash-functions", title: "SHA-256 vs MD5: Which Hash Function Should You Use?" },
  ],
  "regex-tester": [
    { slug: "regex-cheat-sheet-javascript", title: "Regex Cheat Sheet for JavaScript Developers" },
  ],
  "cron-parser": [
    { slug: "cron-expression-syntax-guide", title: "Cron Expression Syntax: A Complete Guide" },
  ],
  "unix-timestamp": [
    { slug: "unix-timestamps-explained", title: "Unix Timestamps Explained for Developers" },
  ],
  "color-converter": [
    { slug: "hex-rgb-hsl-css-colors-explained", title: "HEX, RGB, HSL: CSS Color Formats Explained" },
  ],
  "temperature-converter": [
    { slug: "celsius-to-fahrenheit-converter", title: "Celsius to Fahrenheit: Formula, Examples & Quick Reference Chart" },
  ],
  "morse-code": [
    { slug: "morse-code-alphabet-chart", title: "Morse Code Alphabet: Complete A–Z Chart" },
  ],
  "merge-pdf": [
    { slug: "merge-pdf-online", title: "How to Merge PDFs Online for Free (Browser, macOS, CLI)" },
  ],
  "image-to-pdf": [
    { slug: "image-to-pdf", title: "How to Convert Images to PDF Online (JPG, PNG, HEIC — Free)" },
  ],
  "loan-emi-calculator": [
    { slug: "loan-emi-calculator", title: "EMI Calculator: Formula, How to Calculate Monthly Loan Installments" },
  ],
  "bmi-calculator": [
    { slug: "bmi-calculator", title: "BMI Calculator: What Is BMI and How to Calculate It" },
  ],
  "code-playground": [
    { slug: "browser-code-playground-privacy", title: "Browser Code Playgrounds: What Runs Where" },
  ],
};

/** Inline related-tool links and optional blog post links for tool pages. */
export default function ToolContextualLinks({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const related = getRelatedTools(slug, 4);
  const blogLinks = TOOL_BLOG_LINKS[slug] ?? [];

  if (related.length === 0 && blogLinks.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {related.length > 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/80">Related: </span>
          {related.map((tool, index) => (
            <span key={tool.slug}>
              {index > 0 && (
                <span aria-hidden className="mx-1 text-border">
                  ·
                </span>
              )}
              <Link
                href={publicHrefForToolSlug(tool.slug)}
                className="text-accent hover:underline"
              >
                {relatedToolLinkLabel(tool)}
              </Link>
            </span>
          ))}
        </p>
      )}
      {blogLinks.length > 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground/80">Read also: </span>
          {blogLinks.map((post, index) => (
            <span key={post.slug}>
              {index > 0 && (
                <span aria-hidden className="mx-1 text-border">
                  ·
                </span>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="text-accent hover:underline"
              >
                {post.title}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
