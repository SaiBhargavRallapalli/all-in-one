"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  X,
  Trash2,
  Download,
  Sparkles,
  Share2,
  Code2,
  Eye,
  EyeOff,
} from "lucide-react";
import { CATEGORIES, type Tool } from "@/lib/tools-registry";
import { categoryBrowseHref } from "@/lib/category-navigation";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ToolPageNav from "@/components/ToolPageNav";
import RelatedToolsSection from "@/components/RelatedToolsSection";
import ToolContextualLinks from "@/components/ToolContextualLinks";
import {
  trackToolSuccess,
  trackToolError,
  trackToolCopy,
  trackToolShareLink,
} from "@/lib/analytics-events";
import ToolConnectivityBadge from "@/components/ToolConnectivityBadge";
import ToolPageActions from "@/components/ToolPageActions";
import {
  encodeSharedToolState,
  decodeSharedToolState,
  sharePayloadTooLong,
} from "@/lib/shareable-tool-state";
import type { ToolState } from "@/lib/tool-runner";
import { needsDualInput, needsNoInput } from "@/lib/tool-input-meta";

function EmbedButton({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const copy = () => {
    const code = `<iframe src="https://www.devbench.co.in/embed/${slug}" width="100%" height="500" style="border:none;border-radius:12px;" title="${slug}" loading="lazy"></iframe>`;
    navigator.clipboard.writeText(code).then(() => {
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    }).catch(() => {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {state === "copied" ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : state === "error" ? (
        <X className="w-3.5 h-3.5 text-destructive" />
      ) : (
        <Code2 className="w-3.5 h-3.5" />
      )}
      {state === "copied" ? "Embed code copied" : state === "error" ? "Copy failed" : "Get embed code"}
    </button>
  );
}

function CopyBtn({ text, toolSlug }: { text: string; toolSlug?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
      if (toolSlug) trackToolCopy(toolSlug, "output");
    }).catch(() => {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      disabled={!text}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
        state === "error"
          ? "bg-destructive/10 text-destructive"
          : "bg-accent/10 text-accent hover:bg-accent/20"
      }`}
    >
      {state === "copied" ? <Check className="w-3.5 h-3.5" /> : state === "error" ? <X className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy"}
    </button>
  );
}

function passwordStrength(pw: string): { label: string; color: string; pct: number; bits: number } {
  if (!pw) return { label: "", color: "", pct: 0, bits: 0 };
  let cs = 0;
  if (/[a-z]/.test(pw)) cs += 26;
  if (/[A-Z]/.test(pw)) cs += 26;
  if (/[0-9]/.test(pw)) cs += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) cs += 32;
  const bits = cs > 0 ? Math.floor(pw.length * Math.log2(cs)) : 0;
  if (bits < 28) return { label: "Weak", color: "bg-destructive", pct: Math.max(8, Math.round((bits / 28) * 25)), bits };
  if (bits < 40) return { label: "Fair", color: "bg-warning", pct: 25 + Math.round(((bits - 28) / 12) * 25), bits };
  if (bits < 60) return { label: "Strong", color: "bg-blue-500", pct: 50 + Math.round(((bits - 40) / 20) * 25), bits };
  return { label: "Very strong", color: "bg-success", pct: 100, bits };
}

function AesCopyAsJsonBtn({ ciphertext }: { ciphertext: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const copy = () => {
    const payload = JSON.stringify({
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: 100000,
      ciphertext,
    }, null, 2);
    navigator.clipboard.writeText(payload).then(() => {
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    }).catch(() => {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
        state === "error" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent hover:bg-accent/20"
      }`}
      title="Copy as self-describing JSON envelope"
    >
      {state === "copied" ? <Check className="w-3.5 h-3.5" /> : state === "error" ? <X className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {state === "copied" ? "Copied!" : state === "error" ? "Copy failed" : "Copy as JSON"}
    </button>
  );
}

/** Browsers omit crypto.subtle on insecure HTTP (except localhost). */
function AesWebCryptoUnavailableHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(
      typeof globalThis.crypto !== "undefined" &&
        globalThis.crypto.subtle === undefined
    );
  }, []);
  if (!show) return null;
  return (
    <p
      role="status"
      className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2"
    >
      Web Crypto isn&apos;t available on this URL (needs HTTPS or{" "}
      <span className="font-mono">localhost</span>). Use a secure origin or AES
      encryption will fail.
    </p>
  );
}


const RECOVERY_HINTS: Record<string, string> = {
  "json-formatter": "Make sure your JSON uses double-quoted keys and values, and all brackets are matched.",
  "json-to-yaml": "Paste valid JSON — keys must be double-quoted and the structure must be a valid object or array.",
  "yaml-to-json": "Check for tab characters (YAML requires spaces), consistent indentation, and correct colon spacing.",
  "json-to-csv": "Input must be a JSON array of objects with consistent keys across rows.",
  "csv-to-json": "Check that your CSV has a header row and no unescaped commas inside fields.",
  "json-to-typescript": "Input must be a valid JSON object or array — not a string or primitive value.",
  "json-to-xml": "Input must be a JSON object (not an array) with a single root key.",
  "xml-to-json": "Make sure your XML is well-formed: all tags are closed and attribute values are quoted.",
  "base64-decode": "Input must be a valid Base64 string. Characters outside A–Z, a–z, 0–9, +, /, = are not allowed.",
  "hex-to-text": "Input must contain pairs of hex digits (0–9, A–F). Spaces between bytes are fine.",
  "binary-to-text": "Input must be groups of 8 bits (0s and 1s). Spaces between bytes are fine.",
  "url-decode": "Some malformed percent-encoded sequences cannot be decoded. Check for incomplete % sequences.",
  "html-entity-decode": "Unrecognised named entities will pass through unchanged. Only valid HTML5 entities are decoded.",
  "aes-encrypt-decrypt": "For decryption, make sure you are using the exact same password used to encrypt. The ciphertext must be the unmodified Base64 output.",
  "hash-generator": "The SHA-1 algorithm is available but deprecated for security use. Choose SHA-256 or higher for new work.",
  "semver-compare": "Both inputs must be valid semantic version strings like 1.2.3 or 2.0.0-rc.1.",
  "cron-parser": "Cron expressions need 5 fields: minute, hour, day-of-month, month, day-of-week.",
  "chmod-calculator": "Enter an octal permission like 755 or rwxr-xr-x notation.",
  "url-parser": "Enter a complete URL including the protocol (https:// or http://).",
  "color-converter": "Supported formats: #hex, rgb(), hsl(), named colors (e.g. 'red'), or HSL/HSV values.",
  "temperature-converter": "Enter a plain number (decimals allowed). Select the source unit from the dropdown.",
  "unit-converter": "Enter a plain number. Select the source and target units from the dropdowns.",
  "base-converter": "Enter a valid integer in the selected source base. For hex, only 0–9 and A–F are valid.",
  "quadratic-solver": "Enter coefficients as 'a b c' on one line (e.g. '1 -5 6' for x²−5x+6=0).",
  "aspect-ratio": "Enter dimensions as WxH, W:H, or 'W H' (e.g. 1920x1080).",
  "days-between-dates": "Enter dates in ISO format (YYYY-MM-DD) or common formats like DD/MM/YYYY.",
  "sql-formatter": "Paste a complete SQL statement. Incomplete fragments (e.g. just a WHERE clause) may not parse correctly.",
  "curl-formatter": "Paste a complete curl command starting with 'curl'. Options must use the standard -X, -H, -d flags.",
  "toml-to-json": "Check for unquoted strings, invalid date formats, or duplicate keys in your TOML.",
  "dotenv-parser": "Each line must be KEY=value format. Multi-line values need quotes. Lines starting with # are comments.",
  "find-replace": "If using Regex mode, make sure your pattern is a valid regular expression.",
};

function getRecoveryHint(slug: string, error: string): string | null {
  if (RECOVERY_HINTS[slug]) return RECOVERY_HINTS[slug];
  if (error.toLowerCase().includes("json")) return "Check that your input is valid JSON — missing brackets, trailing commas, and unquoted keys are common mistakes.";
  if (error.toLowerCase().includes("yaml")) return "YAML requires consistent indentation with spaces (not tabs). Colons must be followed by a space.";
  if (error.toLowerCase().includes("xml")) return "XML requires all tags to be properly closed and attribute values to be quoted.";
  return null;
}

export default function GenericToolPageClient({
  slug,
  tool,
  openingParagraph,
}: {
  slug: string;
  tool: Tool;
  openingParagraph: string;
}) {
  const [state, setState] = useState<ToolState>({
    input: "",
    input2: "",
    output: "",
    error: "",
    options: {},
  });

  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const shareHydrated = useRef(false);
  const persistKey = `devbench:input:${slug}`;

  useEffect(() => {
    if (shareHydrated.current) return;
    if (typeof window === "undefined") return;
    const shared = decodeSharedToolState(window.location.hash);
    if (shared) {
      shareHydrated.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => ({ ...s, input: shared.i, input2: shared.i2 ?? "" }));
      return;
    }
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const { input, input2 } = JSON.parse(saved) as { input: string; input2: string };
        setState((s) => ({ ...s, input: input ?? "", input2: input2 ?? "" }));
      }
    } catch {}
  }, [persistKey]);

  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify({ input: state.input, input2: state.input2 }));
    } catch {}
  }, [persistKey, state.input, state.input2]);

  const copyShareLink = useCallback(() => {
    const fragment = encodeSharedToolState(
      state.input,
      needsDualInput(slug) ? state.input2 : undefined,
    );
    if (sharePayloadTooLong(fragment)) {
      window.alert(
        "This input is too large to pack into a URL. Copy the text manually or shorten it.",
      );
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}${fragment}`;
    void navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      trackToolShareLink(slug);
    }).catch(() => {
      setShareError(true);
      setTimeout(() => setShareError(false), 2000);
    });
  }, [slug, state.input, state.input2]);

  const setInput = (input: string) => setState((s) => ({ ...s, input }));
  const setInput2 = (input2: string) => setState((s) => ({ ...s, input2 }));
  const setOption = (key: string, value: string | number | boolean) =>
    setState((s) => ({ ...s, options: { ...s.options, [key]: value } }));

  const process = useCallback(async () => {
    if (!state.input.trim() && !needsNoInput(slug)) {
      setState((s) => ({ ...s, output: "", error: "" }));
      return;
    }

    try {
      const { runTool } = await import("@/lib/tool-runner");
      const result = await runTool(slug, state);
      const output = typeof result === "string" ? result : result.output || "";
      const error = typeof result === "string" ? "" : result.error || "";
      setState((s) => ({ ...s, output, error }));
      if (error) {
        trackToolError(slug, "process", error);
      } else if (output) {
        trackToolSuccess(slug, "process");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "An error occurred";
      setState((s) => ({ ...s, output: "", error: message }));
      trackToolError(slug, "process", message);
    }
  }, [slug, state.input, state.input2, state.options]);

  useEffect(() => {
    const timer = setTimeout(process, 150);
    return () => clearTimeout(timer);
  }, [process, slug]);

  const category = CATEGORIES[tool.category];

  return (
    <>
      <Header />
      <main id="main" className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full scroll-mt-20">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Breadcrumbs
            className="mb-4"
            items={[
              {
                label: category.label,
                href: categoryBrowseHref(tool.category),
              },
              { label: tool.name },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Link
              href={categoryBrowseHref(tool.category)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to {category.label}
            </Link>
            <Link
              href="/#tools"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              All tools
            </Link>
          </div>
          <ToolPageNav className="mb-4" />
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold font-mono ${category.color}`}
            >
              {tool.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{tool.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Link
                  href={categoryBrowseHref(tool.category)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-opacity hover:opacity-80 ${category.color}`}
                >
                  {category.label}
                </Link>
                <ToolConnectivityBadge slug={slug} />
                <ToolPageActions
                  slug={slug}
                  getContent={() => state.input}
                  getContent2={() => state.input2 ?? ""}
                  vaultTitle={tool.shortName}
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {shareCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : shareError ? (
                    <X className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  {shareCopied ? "Link copied" : shareError ? "Copy failed" : "Copy share link"}
                </button>
                <EmbedButton slug={slug} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {openingParagraph}
              </p>
              <ToolContextualLinks slug={slug} className="mt-3 max-w-2xl" />
            </div>
          </div>
        </div>

        {/* Tool options */}
        {renderOptions(slug, state.options, setOption, setInput)}

        {/* Input / Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
          {/* Input */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="tool-input" className="text-sm font-medium">
                {tool.inputLabel || "Input"}
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      input: "",
                      output: "",
                      error: "",
                    }))
                  }
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  title="Clear"
                  aria-label="Clear input"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              id="tool-input"
              value={state.input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste your ${tool.inputLabel?.toLowerCase() || "input"} here...`}
              className="flex-1 min-h-[300px] p-4 rounded-xl border border-border bg-card font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50 scrollbar-thin"
              spellCheck={false}
            />
          </div>

          {/* Second input for diff-style tools */}
          {needsDualInput(slug) ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="tool-input2" className="text-sm font-medium">
                  {tool.outputLabel || "Input B"}
                </label>
                <button
                  onClick={() => setInput2("")}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                  title="Clear"
                  aria-label="Clear second input"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                id="tool-input2"
                value={state.input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder="Paste second input here..."
                className="flex-1 min-h-[300px] p-4 rounded-xl border border-border bg-card font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 placeholder:text-muted-foreground/50 scrollbar-thin"
                spellCheck={false}
              />
            </div>
          ) : (
            /* Output */
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="tool-output" className="text-sm font-medium">
                  {tool.outputLabel || "Output"}
                </label>
                <div className="flex items-center gap-1">
                  <CopyBtn text={state.output} toolSlug={slug} />
                  {state.output && (
                    <button
                      onClick={() => {
                        const blob = new Blob([state.output], {
                          type: "text/plain",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${slug}-output.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                      title="Download output"
                      aria-label="Download output"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id="tool-output"
                value={state.output}
                readOnly
                placeholder="Output will appear here..."
                className="flex-1 min-h-[300px] p-4 rounded-xl border border-border bg-muted/50 font-mono text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 scrollbar-thin"
                spellCheck={false}
              />
              {slug === "aes-encrypt-decrypt" && state.output && ((state.options.mode as string) || "encrypt") === "encrypt" && (
                <div className="mt-2 flex flex-wrap gap-2 items-center">
                  <AesCopyAsJsonBtn ciphertext={state.output} />
                  <button
                    onClick={() => {
                      const blob = new Blob([state.output], { type: "application/octet-stream" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "encrypted.enc";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Download as .enc file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .enc
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Diff output for dual-input tools */}
        {needsDualInput(slug) && state.output && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Diff Result</p>
              <CopyBtn text={state.output} toolSlug={slug} />
            </div>
            <pre className="p-4 rounded-xl border border-border bg-card font-mono text-sm overflow-auto max-h-[400px] scrollbar-thin whitespace-pre-wrap">
              {state.output.split("\n").map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("+")
                      ? "text-success bg-success/10"
                      : line.startsWith("-")
                        ? "text-destructive bg-destructive/10"
                        : line.startsWith("@@")
                          ? "text-accent"
                          : ""
                  }
                >
                  {line}
                </div>
              ))}
            </pre>
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div role="alert" aria-live="assertive" className="mt-4 p-4 rounded-xl border border-destructive/30 bg-destructive/5 animate-fade-in">
            <p className="text-sm text-destructive font-medium">{state.error}</p>
            {(() => {
              const hint = getRecoveryHint(slug, state.error);
              return hint ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
              ) : null;
            })()}
          </div>
        )}

        {/* Stats */}
        {state.input && !state.error && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Input: {state.input.length} chars</span>
            {state.output && <span>Output: {state.output.length} chars</span>}
            {state.output && state.input.length > 0 && (
              <span>
                Ratio:{" "}
                {((state.output.length / state.input.length) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        )}

        <RelatedToolsSection
          slug={slug}
          variant="cards"
          className="mt-10 border-t border-border pt-8 scroll-mt-24"
        />
      </main>
    </>
  );
}

function renderOptions(
  slug: string,
  options: Record<string, string | number | boolean>,
  setOption: (key: string, value: string | number | boolean) => void,
  setMainInput?: (value: string) => void
) {
  const selectClass =
    "px-3 py-1.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40";
  const inputClass =
    "px-3 py-1.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40 w-20";

  switch (slug) {
    case "case-converter":
      return (
        <div className="mb-4">
          <label htmlFor="opt-case" className="text-sm font-medium mr-2">Target Case:</label>
          <select
            id="opt-case"
            value={(options.targetCase as string) || "camelCase"}
            onChange={(e) => setOption("targetCase", e.target.value)}
            className={selectClass}
          >
            <option value="camelCase">camelCase</option>
            <option value="PascalCase">PascalCase</option>
            <option value="snake_case">snake_case</option>
            <option value="kebab-case">kebab-case</option>
            <option value="UPPER_CASE">UPPER_CASE</option>
            <option value="lower">lowercase</option>
            <option value="Title">Title Case</option>
            <option value="Sentence">Sentence case</option>
          </select>
        </div>
      );
    case "line-sorter":
      return (
        <div className="mb-4">
          <label htmlFor="opt-sort-mode" className="text-sm font-medium mr-2">Mode:</label>
          <select
            id="opt-sort-mode"
            value={(options.mode as string) || "asc"}
            onChange={(e) => setOption("mode", e.target.value)}
            className={selectClass}
          >
            <option value="asc">Sort A → Z</option>
            <option value="desc">Sort Z → A</option>
            <option value="reverse">Reverse</option>
            <option value="shuffle">Shuffle</option>
            <option value="unique">Remove Duplicates</option>
          </select>
        </div>
      );
    case "lorem-ipsum":
      return (
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label htmlFor="opt-lorem-count" className="text-sm font-medium mr-2">Count:</label>
            <input
              id="opt-lorem-count"
              type="number"
              min={1}
              max={50}
              value={(options.count as number) || 3}
              onChange={(e) => setOption("count", parseInt(e.target.value) || 3)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="opt-lorem-unit" className="text-sm font-medium mr-2">Unit:</label>
            <select
              id="opt-lorem-unit"
              value={(options.unit as string) || "paragraphs"}
              onChange={(e) => setOption("unit", e.target.value)}
              className={selectClass}
            >
              <option value="paragraphs">Paragraphs</option>
              <option value="sentences">Sentences</option>
              <option value="words">Words</option>
            </select>
          </div>
        </div>
      );
    case "uuid-generator":
      return (
        <div className="mb-4">
          <label htmlFor="opt-uuid-count" className="text-sm font-medium mr-2">Count:</label>
          <input
            id="opt-uuid-count"
            type="number"
            min={1}
            max={25}
            value={(options.count as number) || 5}
            onChange={(e) => setOption("count", parseInt(e.target.value) || 5)}
            className={inputClass}
          />
        </div>
      );
    case "password-generator":
      return (
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <div>
            <label htmlFor="opt-pw-len" className="text-sm font-medium mr-2">Length:</label>
            <input
              id="opt-pw-len"
              type="number"
              min={4}
              max={128}
              value={(options.length as number) || 16}
              onChange={(e) =>
                setOption("length", parseInt(e.target.value) || 16)
              }
              className={inputClass}
            />
          </div>
          {["Uppercase", "Lowercase", "Digits", "Symbols"].map((opt) => {
            const key = opt.toLowerCase();
            return (
              <label key={opt} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={options[key] !== false}
                  onChange={(e) => setOption(key, e.target.checked)}
                  className="rounded"
                />
                {opt}
              </label>
            );
          })}
        </div>
      );
    case "string-escape":
      return (
        <div className="mb-4">
          <label htmlFor="opt-escape-mode" className="text-sm font-medium mr-2">Mode:</label>
          <select
            id="opt-escape-mode"
            value={(options.mode as string) || "json"}
            onChange={(e) => setOption("mode", e.target.value)}
            className={selectClass}
          >
            <option value="json">JSON</option>
            <option value="js">JavaScript</option>
            <option value="sql">SQL</option>
            <option value="regex">Regex</option>
          </select>
        </div>
      );
    case "curl-formatter":
      return (
        <div className="mb-4">
          <label htmlFor="opt-curl-layout" className="text-sm font-medium mr-2">Output:</label>
          <select
            id="opt-curl-layout"
            value={(options.layout as string) || "multiline"}
            onChange={(e) => setOption("layout", e.target.value)}
            className={selectClass}
          >
            <option value="multiline">Multi-line (POSIX / bash)</option>
            <option value="oneline">Single line</option>
          </select>
        </div>
      );
    case "base-converter":
      return (
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label htmlFor="opt-base-from" className="text-sm font-medium mr-2">From:</label>
            <select
              id="opt-base-from"
              value={(options.fromBase as number) || 10}
              onChange={(e) => setOption("fromBase", parseInt(e.target.value))}
              className={selectClass}
            >
              <option value={2}>Binary (2)</option>
              <option value={8}>Octal (8)</option>
              <option value={10}>Decimal (10)</option>
              <option value={16}>Hex (16)</option>
            </select>
          </div>
          <div>
            <label htmlFor="opt-base-to" className="text-sm font-medium mr-2">To:</label>
            <select
              id="opt-base-to"
              value={(options.toBase as number) || 16}
              onChange={(e) => setOption("toBase", parseInt(e.target.value))}
              className={selectClass}
            >
              <option value={2}>Binary (2)</option>
              <option value={8}>Octal (8)</option>
              <option value={10}>Decimal (10)</option>
              <option value={16}>Hex (16)</option>
            </select>
          </div>
        </div>
      );
    case "whitespace-normalizer":
      return (
        <div className="mb-4">
          <label htmlFor="opt-ws-mode" className="text-sm font-medium mr-2">Mode:</label>
          <select
            id="opt-ws-mode"
            value={(options.mode as string) || "collapse"}
            onChange={(e) => setOption("mode", e.target.value)}
            className={selectClass}
          >
            <option value="collapse">Collapse spaces</option>
            <option value="trim">Trim lines</option>
            <option value="remove-blank">Remove blank lines</option>
            <option value="single-space">Single space between words</option>
            <option value="all">All normalizations</option>
          </select>
        </div>
      );
    case "find-replace":
      return (
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="opt-find" className="text-sm font-medium block mb-1">Find:</label>
            <input
              id="opt-find"
              type="text"
              value={(options.find as string) || ""}
              onChange={(e) => setOption("find", e.target.value)}
              placeholder="Search text"
              className={`${selectClass} w-48`}
            />
          </div>
          <div>
            <label htmlFor="opt-replace" className="text-sm font-medium block mb-1">Replace:</label>
            <input
              id="opt-replace"
              type="text"
              value={(options.replace as string) || ""}
              onChange={(e) => setOption("replace", e.target.value)}
              placeholder="Replace with"
              className={`${selectClass} w-48`}
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm pb-1.5">
            <input
              type="checkbox"
              checked={!!options.useRegex}
              onChange={(e) => setOption("useRegex", e.target.checked)}
              className="rounded"
            />
            Regex
          </label>
          <label className="flex items-center gap-1.5 text-sm pb-1.5">
            <input
              type="checkbox"
              checked={!!options.caseInsensitive}
              onChange={(e) => setOption("caseInsensitive", e.target.checked)}
              className="rounded"
            />
            Case insensitive
          </label>
        </div>
      );
    case "unit-converter": {
      const unitOptions: Record<string, string[]> = {
        length: ["mm", "cm", "m", "km", "inch", "ft", "yd", "mi", "nm"],
        weight: ["mg", "g", "kg", "t", "oz", "lb", "st"],
        area: ["mm²", "cm²", "m²", "km²", "in²", "ft²", "yd²", "mi²", "ha", "ac"],
        volume: ["ml", "cl", "dl", "l", "m³", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal", "in³", "ft³"],
        speed: ["m/s", "km/h", "mph", "knot", "ft/s", "mach"],
        temperature: ["C", "F", "K"],
      };
      const cat = (options.unitCategory as string) || "length";
      const units = unitOptions[cat] || unitOptions.length;
      return (
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <label htmlFor="opt-unit-cat" className="text-sm font-medium mr-2">Category:</label>
            <select id="opt-unit-cat" value={cat} onChange={(e) => setOption("unitCategory", e.target.value)} className={selectClass}>
              {Object.keys(unitOptions).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="opt-unit-from" className="text-sm font-medium mr-2">From:</label>
            <select id="opt-unit-from" value={(options.unitFrom as string) || units[0]} onChange={(e) => setOption("unitFrom", e.target.value)} className={selectClass}>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="opt-unit-to" className="text-sm font-medium mr-2">To:</label>
            <select id="opt-unit-to" value={(options.unitTo as string) || units[1]} onChange={(e) => setOption("unitTo", e.target.value)} className={selectClass}>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      );
    }
    case "temperature-converter":
      return (
        <div className="mb-4">
          <label htmlFor="opt-temp-from" className="text-sm font-medium mr-2">From:</label>
          <select
            id="opt-temp-from"
            value={(options.from as string) || "C"}
            onChange={(e) => setOption("from", e.target.value)}
            className={selectClass}
          >
            <option value="C">Celsius</option>
            <option value="F">Fahrenheit</option>
            <option value="K">Kelvin</option>
          </select>
        </div>
      );
    case "byte-converter":
      return (
        <div className="mb-4">
          <label htmlFor="opt-byte-from" className="text-sm font-medium mr-2">From Unit:</label>
          <select
            id="opt-byte-from"
            value={(options.fromUnit as string) || "B"}
            onChange={(e) => setOption("fromUnit", e.target.value)}
            className={selectClass}
          >
            {["B", "KB", "MB", "GB", "TB", "PB"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      );
    case "hash-generator":
      return (
        <div className="mb-4">
          <label htmlFor="opt-hash-algo" className="text-sm font-medium mr-2">Algorithm:</label>
          <select
            id="opt-hash-algo"
            value={(options.algo as string) || "SHA-256"}
            onChange={(e) => setOption("algo", e.target.value)}
            className={selectClass}
          >
            <option value="SHA-1">SHA-1</option>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-384">SHA-384</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </div>
      );
    case "aes-encrypt-decrypt": {
      const pwGenLen = Math.min(
        128,
        Math.max(4, (options.aesPwLen as number) || 24)
      );
      const pwGenOpts = {
        uppercase: options.aesPwUppercase !== false,
        lowercase: options.aesPwLowercase !== false,
        digits: options.aesPwDigits !== false,
        symbols: options.aesPwSymbols !== false,
      };
      const fillGeneratedPassword = () => {
        void import("@/lib/engines/dev").then(({ generatePassword }) => {
          const r = generatePassword(pwGenLen, pwGenOpts);
          if (typeof r === "string") {
            setOption("password", r);
            return;
          }
          if (!r.error && r.output) setOption("password", r.output);
        });
      };

      return (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label htmlFor="opt-aes-mode" className="text-sm font-medium block mb-1">Mode:</label>
              <select
                id="opt-aes-mode"
                value={(options.mode as string) || "encrypt"}
                onChange={(e) => setOption("mode", e.target.value)}
                className={selectClass}
              >
                <option value="encrypt">Encrypt</option>
                <option value="decrypt">Decrypt</option>
              </select>
            </div>
            <div className="min-w-[12rem] flex-1 max-w-md">
              <label htmlFor="opt-aes-pw" className="text-sm font-medium block mb-1">Password:</label>
              <div className="relative">
                <input
                  id="opt-aes-pw"
                  type={options.aesShowPw ? "text" : "password"}
                  value={(options.password as string) || ""}
                  onChange={(e) => setOption("password", e.target.value)}
                  placeholder="Enter password…"
                  autoComplete="off"
                  className={selectClass + " w-full pr-9"}
                />
                <button
                  type="button"
                  onClick={() => setOption("aesShowPw", !options.aesShowPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={options.aesShowPw ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {options.aesShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="py-1.5 space-y-1.5">
              {(() => {
                const pw = (options.password as string) || "";
                const s = passwordStrength(pw);
                return pw ? (
                  <>
                    <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${s.color}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium">{s.label}</span> — ~{s.bits} bits entropy
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">AES-256-GCM · PBKDF2 · client-side only</p>
                );
              })()}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/25 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Password generator
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label htmlFor="opt-aes-gen-len" className="text-xs font-medium mr-2">Length:</label>
                <input
                  id="opt-aes-gen-len"
                  type="number"
                  min={4}
                  max={128}
                  value={(options.aesPwLen as number) || 24}
                  onChange={(e) =>
                    setOption("aesPwLen", parseInt(e.target.value) || 24)
                  }
                  className={inputClass}
                />
              </div>
              {(
                [
                  ["Uppercase", "aesPwUppercase"],
                  ["Lowercase", "aesPwLowercase"],
                  ["Digits", "aesPwDigits"],
                  ["Symbols", "aesPwSymbols"],
                ] as const
              ).map(([label, key]) => (
                <label key={key} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={options[key] !== false}
                    onChange={(e) => setOption(key, e.target.checked)}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
              <button
                type="button"
                onClick={fillGeneratedPassword}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fill password
              </button>
            </div>
          </div>

          <AesWebCryptoUnavailableHint />

          {setMainInput && (
            <div className="rounded-xl border border-border bg-muted/25 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Load from file <span className="font-normal opacity-70">— JSON, TXT, or any text file</span>
              </p>
              <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-colors">
                <Download className="w-3.5 h-3.5 rotate-180" />
                Choose file
                <input
                  type="file"
                  accept=".json,.txt,.aes,.enc,text/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const content = ev.target?.result;
                      if (typeof content === "string") setMainInput(content);
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                For <strong>Encrypt</strong>: load a JSON or text file — its content becomes the plaintext.<br />
                For <strong>Decrypt</strong>: load a file containing the Base64 ciphertext (or a JSON object with a <code className="font-mono">ciphertext</code> field).
              </p>
            </div>
          )}
        </div>
      );
    }
    case "gst-calculator":
      return (
        <div className="mb-4">
          <label htmlFor="opt-gst-basis" className="text-sm font-medium mr-2">GST basis:</label>
          <select
            id="opt-gst-basis"
            value={(options.gstBasis as string) || "exclusive"}
            onChange={(e) => setOption("gstBasis", e.target.value)}
            className={selectClass}
          >
            <option value="exclusive">Add GST to net amount</option>
            <option value="inclusive">Extract GST from gross</option>
          </select>
        </div>
      );
    default:
      return null;
  }
}
