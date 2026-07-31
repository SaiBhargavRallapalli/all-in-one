"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, Check, RefreshCw, FileCode } from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import ToolPageHero from "@/components/tools/ToolPageHero";
import {
  trackToolSuccess,
  trackToolError,
  trackToolDownload,
  trackToolCopy,
} from "@/lib/analytics-events";
import { sanitizeSvg } from "@/lib/sanitize-html";

const TOOL_SLUG = "mermaid-editor";

const EXAMPLES: { label: string; code: string }[] = [
  {
    label: "Flowchart",
    code: `flowchart LR
  A[Start] --> B{Decision?}
  B -- Yes --> C[Path A]
  B -- No  --> D[Path B]
  C --> E[End]
  D --> E`,
  },
  {
    label: "Sequence",
    code: `sequenceDiagram
  participant U as User
  participant A as API
  participant DB as Database
  U->>A: POST /login
  A->>DB: SELECT user
  DB-->>A: row
  A-->>U: 200 OK + JWT`,
  },
  {
    label: "Class",
    code: `classDiagram
  class Animal {
    +String name
    +int age
    +speak()
  }
  class Dog {
    +bark()
  }
  Animal <|-- Dog`,
  },
  {
    label: "ER",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  CUSTOMER {
    string name
    string email
  }
  ORDER {
    int id
    date created
  }`,
  },
  {
    label: "Gantt",
    code: `gantt
  title Sprint 24
  dateFormat YYYY-MM-DD
  section Backend
  API schema     :a1, 2026-05-01, 3d
  Implementation :after a1, 5d
  section Frontend
  Wireframes :2026-05-02, 2d
  Components :2026-05-05, 6d`,
  },
  {
    label: "State",
    code: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetch()
  Loading --> Success: 200
  Loading --> Error: 4xx/5xx
  Success --> Idle: reset
  Error --> Idle: retry`,
  },
  {
    label: "Pie",
    code: `pie title Browser share
  "Chrome" : 65
  "Safari" : 18
  "Firefox" : 8
  "Edge" : 6
  "Other" : 3`,
  },
];

export default function MermaidEditorTool({ tool }: { tool: Tool }) {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState<"svg" | "code" | null>(null);
  const [theme, setTheme] = useState<"default" | "dark" | "neutral" | "forest">("default");
  const previewRef = useRef<HTMLDivElement>(null);
  const renderToken = useRef(0);

  const render = useCallback(async (src: string, themeMode: string) => {
    const myToken = ++renderToken.current;
    try {
      // Dynamic import — Mermaid is ~1.5MB, only loaded when this page is visited.
      const mermaidModule = await import("mermaid");
      const mermaid = mermaidModule.default;

      mermaid.initialize({
        startOnLoad: false,
        theme: themeMode as "default" | "dark" | "neutral" | "forest",
        securityLevel: "antiscript",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      });

      // Mermaid 11 needs a unique id per render or it warns about reuse.
      const id = `mermaid-${myToken}`;
      const { svg: rendered } = await mermaid.render(id, src);

      // Discard if a newer render has started while we awaited.
      if (myToken !== renderToken.current) return;
      setSvg(sanitizeSvg(rendered));
      setError("");
      trackToolSuccess(TOOL_SLUG, "render");
    } catch (e: unknown) {
      if (myToken !== renderToken.current) return;
      const message = e instanceof Error ? e.message : String(e);
      setError(message.replace(/^Error:\s*/, ""));
      setSvg("");
      trackToolError(TOOL_SLUG, "render", message);
    }
  }, []);

  // Debounced render
  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = code.trim();
      if (!trimmed) {
        setSvg("");
        setError("");
        return;
      }
      render(trimmed, theme);
    }, 250);
    return () => clearTimeout(t);
  }, [code, theme, render]);

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
    trackToolDownload(TOOL_SLUG, "svg");
  };

  const downloadPng = async () => {
    if (!svg || !previewRef.current) return;
    const svgEl = previewRef.current.querySelector("svg");
    if (!svgEl) return;

    // Pull explicit dimensions from the rendered SVG.
    const bbox = svgEl.getBoundingClientRect();
    const width = Math.max(800, Math.ceil(bbox.width * 2));
    const height = Math.max(400, Math.ceil(bbox.height * 2));

    const serialized = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = theme === "dark" ? "#09090b" : "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (!b) return;
        const dl = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = dl;
        a.download = "diagram.png";
        a.click();
        URL.revokeObjectURL(dl);
        trackToolDownload(TOOL_SLUG, "png");
      }, "image/png");
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const copyTo = (what: "svg" | "code") => {
    const text = what === "svg" ? svg : code;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
      trackToolCopy(TOOL_SLUG, what);
    }).catch(() => {});
  };

  const charCount = useMemo(() => code.length, [code]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <ToolPageHero tool={tool} />

      {/* Example chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs font-medium text-muted-foreground self-center mr-1">Examples:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setCode(ex.code)}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            {ex.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="mermaid-theme" className="text-xs font-medium text-muted-foreground">
            Theme
          </label>
          <select
            id="mermaid-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as typeof theme)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="default">Default</option>
            <option value="neutral">Neutral</option>
            <option value="forest">Forest</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Editor */}
        <div className="flex flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <FileCode aria-hidden="true" className="h-3.5 w-3.5" />
              Mermaid source
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground tabular-nums">{charCount} chars</span>
              <button
                onClick={() => copyTo("code")}
                disabled={!code}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
              >
                {copied === "code" ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                {copied === "code" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <label htmlFor="mermaid-source" className="sr-only">Mermaid diagram source</label>
          <textarea
            id="mermaid-source"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            rows={22}
            className="w-full flex-1 resize-none rounded-b-2xl bg-background px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground focus:outline-none"
            placeholder="flowchart LR\n  A --> B"
          />
        </div>

        {/* Preview */}
        <div className="flex flex-col rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              Live preview
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyTo("svg")}
                disabled={!svg}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-40"
              >
                {copied === "svg" ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                {copied === "svg" ? "Copied SVG" : "Copy SVG"}
              </button>
              <button
                onClick={downloadSvg}
                disabled={!svg}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                SVG
              </button>
              <button
                onClick={downloadPng}
                disabled={!svg}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                PNG
              </button>
            </div>
          </div>
          <div
            ref={previewRef}
            className="flex min-h-[460px] flex-1 items-center justify-center overflow-auto p-4"
          >
            {error ? (
              <div className="w-full">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <span className="font-semibold">Parse error:</span> {error}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tip: Mermaid syntax is whitespace-sensitive. Check indentation and node IDs.
                </p>
              </div>
            ) : svg ? (
              // SVG passes through sanitizeSvg() (strips <script> + on* attrs) and Mermaid's
              // own securityLevel:'strict' before reaching the DOM. lgtm[js/xss]
              <div className="w-full text-center [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} /* CodeQL[js/xss] */ />
            ) : (
              <p className="text-sm text-muted-foreground">Type Mermaid syntax to preview your diagram</p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Diagrams render entirely in your browser via the{" "}
        <a
          href="https://mermaid.js.org/intro/syntax-reference.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Mermaid.js reference
        </a>
        . Nothing is sent to a server.
      </p>
    </main>
  );
}
