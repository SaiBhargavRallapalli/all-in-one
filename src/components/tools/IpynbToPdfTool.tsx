"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Copy,
  Printer,
  RotateCcw,
  Eye,
  Code2,
  Check,
  Sparkles,
  Download,
  Loader2,
} from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import ToolPageHero from "@/components/tools/ToolPageHero";
import {
  trackToolSuccess,
  trackToolError,
  trackToolCopy,
} from "@/lib/analytics-events";
import {
  type Notebook,
  notebookToHtml,
} from "@/lib/notebook-to-html";
import { notebookToPdf } from "@/lib/notebook-to-pdf";
import { downloadUint8 } from "@/lib/pdf-download";

const TOOL_SLUG = "ipynb-to-pdf";

// ─── Sample notebook (Try Sample button) ───────────────────────────────

const SAMPLE_NOTEBOOK: Notebook = {
  metadata: { kernelspec: { display_name: "Python 3", name: "python3" } },
  cells: [
    {
      cell_type: "markdown",
      source:
        "# Sample notebook\n\nThis demonstrates how DevBench renders Jupyter notebooks. It shows **bold**, *italic*, `inline code`, lists, and code cells with output.",
    },
    {
      cell_type: "markdown",
      source:
        "## Loading data\n\nA quick pandas example. The DataFrame's HTML representation will render as a styled table in the PDF.",
    },
    {
      cell_type: "code",
      execution_count: 1,
      source: "import pandas as pd\n\ndf = pd.DataFrame({\n    'fruit': ['apple', 'banana', 'cherry', 'date'],\n    'weight_g': [180, 120, 8, 7],\n    'colour': ['red', 'yellow', 'red', 'brown'],\n})\ndf",
      outputs: [
        {
          output_type: "execute_result",
          data: {
            "text/html":
              '<div>\n<table border="1" class="dataframe">\n  <thead>\n    <tr style="text-align: right;">\n      <th></th>\n      <th>fruit</th>\n      <th>weight_g</th>\n      <th>colour</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr><th>0</th><td>apple</td><td>180</td><td>red</td></tr>\n    <tr><th>1</th><td>banana</td><td>120</td><td>yellow</td></tr>\n    <tr><th>2</th><td>cherry</td><td>8</td><td>red</td></tr>\n    <tr><th>3</th><td>date</td><td>7</td><td>brown</td></tr>\n  </tbody>\n</table>\n</div>',
            "text/plain":
              "    fruit  weight_g  colour\n0   apple       180     red\n1  banana       120  yellow\n2  cherry         8     red\n3    date         7   brown",
          },
        },
      ],
    },
    {
      cell_type: "code",
      execution_count: 2,
      source: "print(f'Total weight: {df.weight_g.sum()} g')\nprint(f'Heaviest: {df.loc[df.weight_g.idxmax(), \"fruit\"]}')",
      outputs: [
        {
          output_type: "stream",
          name: "stdout",
          text: "Total weight: 315 g\nHeaviest: apple\n",
        },
      ],
    },
    {
      cell_type: "markdown",
      source:
        "### What gets preserved\n\n- Markdown formatting (headings, lists, bold/italic)\n- Code cells with execution counts\n- Stream output (stdout/stderr)\n- HTML tables (pandas DataFrames)\n- PNG/JPEG/SVG images (matplotlib, seaborn)\n- Error tracebacks (with ANSI codes stripped)\n\n> Click **Generate PDF** and pick *Save as PDF* in the print dialog.",
    },
  ],
};

// ─── Component ─────────────────────────────────────────────────────────

export default function IpynbToPdfTool({ tool }: { tool: Tool }) {
  const [file, setFile] = useState<File | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [copied, setCopied] = useState(false);
  const [includeOutputs, setIncludeOutputs] = useState(true);
  const [includeCodeCells, setIncludeCodeCells] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [scale, setScale] = useState(0.75);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const html = useMemo(() => {
    if (!notebook) return "";
    return notebookToHtml(notebook, docTitle || "Notebook", {
      includeCodeCells,
      includeOutputs,
    });
  }, [notebook, docTitle, includeCodeCells, includeOutputs]);

  // Rough page estimate: empirically ~22 pages at 0.5, ~39 at 0.75, ~57 at 1.0
  const estimatedPages = Math.round(22 + (scale - 0.5) * 70);

  const acceptFile = useCallback(async (f: File | null) => {
    setError("");
    if (!f) {
      setFile(null);
      setNotebook(null);
      setDocTitle("");
      return;
    }
    if (!f.name.toLowerCase().endsWith(".ipynb")) {
      setError("That doesn't look like a .ipynb file.");
      return;
    }
    try {
      const text = await f.text();
      const nb = JSON.parse(text) as Notebook;
      if (!Array.isArray(nb.cells)) {
        throw new Error("Notebook has no cells array.");
      }
      setFile(f);
      setNotebook(nb);
      setDocTitle(f.name.replace(/\.ipynb$/i, ""));
      trackToolSuccess(TOOL_SLUG, "parse", { cells: nb.cells.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not parse notebook.";
      setError(msg);
      trackToolError(TOOL_SLUG, "parse", msg);
    }
  }, []);

  const trySample = useCallback(() => {
    setError("");
    setNotebook(SAMPLE_NOTEBOOK);
    setDocTitle("Sample Notebook");
    setFile(null);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setNotebook(null);
    setDocTitle("");
    setError("");
    setCopied(false);
    setConversionError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const generatePdf = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    trackToolSuccess(TOOL_SLUG, "generate_pdf");
  }, []);

  const downloadPdf = useCallback(async () => {
    if (!notebook) return;
    setIsConverting(true);
    setConversionError("");

    const outName = `${(docTitle || file?.name.replace(/\.ipynb$/i, "") || "notebook").replace(
      /[/\\?%*:|"<>]/g,
      "_",
    )}.pdf`;

    // 1) Prefer server Chromium when it works (full HTML fidelity + scale).
    // 2) Always fall back to client pdf-lib so Download never dead-ends on
    //    serverless (jupyter skipped; isomorphic-dompurify/Chromium can fail).
    const fileToSend: File = file
      ? file
      : new File(
          [JSON.stringify(SAMPLE_NOTEBOOK, null, 2)],
          "sample-notebook.ipynb",
          { type: "application/json" },
        );

    try {
      try {
        const form = new FormData();
        form.append("file", fileToSend);
        form.append("scale", String(scale));
        const res = await fetch("/api/convert-notebook", { method: "POST", body: form });
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          if (buf.byteLength > 4 && String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) === "%PDF") {
            downloadUint8(buf, outName, "application/pdf", TOOL_SLUG);
            trackToolSuccess(TOOL_SLUG, "download_pdf", { scale, via: "server" });
            return;
          }
        }
      } catch {
        /* fall through to client */
      }

      const bytes = await notebookToPdf(notebook, {
        includeCodeCells,
        includeOutputs,
        scale,
        title: docTitle || "Notebook",
      });
      downloadUint8(bytes, outName, "application/pdf", TOOL_SLUG);
      trackToolSuccess(TOOL_SLUG, "download_pdf", { scale, via: "client" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed.";
      setConversionError(msg);
      trackToolError(TOOL_SLUG, "download_pdf", msg);
    } finally {
      setIsConverting(false);
    }
  }, [notebook, file, scale, docTitle, includeCodeCells, includeOutputs]);

  const copyHtml = useCallback(() => {
    if (!html) return;
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      trackToolCopy(TOOL_SLUG, "html");
    }).catch(() => {});
  }, [html]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void acceptFile(f);
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <ToolPageHero tool={tool} />

      {/* Upload + Features row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upload */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <FileText aria-hidden="true" className="h-4 w-4 text-accent" />
            Upload IPYNB File
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Drag and drop or click to upload your .ipynb file
          </p>

          <label
            htmlFor="ipynb-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${
              dragOver
                ? "border-accent bg-accent/5"
                : "border-border bg-background hover:border-accent/40 hover:bg-muted/40"
            }`}
          >
            <Upload aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
            {file ? (
              <>
                <span className="text-xs text-muted-foreground">Drop your .ipynb file here or click to browse</span>
                <span className="text-sm font-medium text-foreground">
                  Selected: {file.name}
                </span>
              </>
            ) : notebook ? (
              <>
                <span className="text-xs text-muted-foreground">Drop your .ipynb file here or click to browse</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Using sample notebook
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Drop your .ipynb file here or click to browse
              </span>
            )}
          </label>
          <input
            ref={fileInputRef}
            id="ipynb-file"
            type="file"
            accept=".ipynb,application/json"
            onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />

          <button
            type="button"
            onClick={trySample}
            className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            Try Sample Notebook
          </button>

          {error && (
            <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </section>

        {/* Options + features */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold">Options</h3>
          <div className="space-y-2 mb-4">
            <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={includeCodeCells}
                onChange={(e) => setIncludeCodeCells(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Include code cells
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={includeOutputs}
                onChange={(e) => setIncludeOutputs(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Include cell outputs
            </label>
          </div>

          {/* Scale slider — controls Puppeteer PDF density */}
          <div className="rounded-lg border border-border bg-background px-3 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">PDF Scale</span>
              <span className="text-xs text-muted-foreground">
                ~{estimatedPages} pages · {Math.round(scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>0.5 — compact</span>
              <span>0.75 — default</span>
              <span>1.0 — full size</span>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold">What gets rendered</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>✓ Markdown (headings, lists, bold/italic, links, code)</li>
            <li>✓ Code cells with In&nbsp;[n] labels</li>
            <li>✓ HTML tables (pandas DataFrames) with proper borders</li>
            <li>✓ PNG / JPEG / SVG images (matplotlib, seaborn, plotly static)</li>
            <li>✓ Stream output (stdout/stderr, ANSI stripped)</li>
            <li>✓ Error tracebacks</li>
            <li>✗ LaTeX / MathJax (use <code className="font-mono">nbconvert</code> — see below)</li>
            <li>✗ Interactive widgets (ipywidgets, Plotly interactive)</li>
          </ul>
        </section>
      </div>

      {/* Preview section */}
      {notebook && (
        <section className="mt-6 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <div>
              <h2 className="text-sm font-semibold">PDF Preview</h2>
              <p className="text-xs text-muted-foreground">Your notebook is ready for PDF export</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyHtml}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Copy HTML
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={isConverting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-60"
              >
                {isConverting ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> Converting…
                  </>
                ) : (
                  <>
                    <Download aria-hidden="true" className="h-3.5 w-3.5" /> Download PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={generatePdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                title="Open browser print dialog"
              >
                <Printer aria-hidden="true" className="h-3.5 w-3.5" /> Print
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="grid grid-cols-2 gap-1 border-b border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "preview"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye aria-hidden="true" className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={() => setTab("html")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "html"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 aria-hidden="true" className="h-3.5 w-3.5" /> HTML Source
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {tab === "preview" ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                title="Notebook preview"
                className="h-[640px] w-full rounded-lg border border-border bg-white"
                sandbox="allow-same-origin allow-modals allow-popups"
              />
            ) : (
              <pre className="max-h-[640px] overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
                <code>{html}</code>
              </pre>
            )}
          </div>

          {/* Conversion error */}
          {conversionError && (
            <div className="mx-4 mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
              <strong>Download failed:</strong> {conversionError}
              <span className="block mt-1 text-muted-foreground">
                You can still use <strong>Print</strong> → Save as PDF for full HTML fidelity (tables, SVG).
              </span>
            </div>
          )}

          {/* Info note */}
          <div className="border-t border-border bg-accent/5 px-5 py-3 text-xs text-foreground/80">
            <strong>Download PDF</strong> tries the server converter first, then builds a PDF in your browser
            (markdown, code, text outputs, PNG/JPEG). Scale applies to both paths.
            {" "}<strong>Print</strong> opens the browser print dialog for the highest-fidelity HTML preview.
          </div>
        </section>
      )}

      {/* nbconvert CLI fallback */}
      <details className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground/80">
          Need LaTeX math or interactive widgets? Use <code className="font-mono text-[11px]">nbconvert</code>
        </summary>
        <div className="mt-3 space-y-3">
          <p>
            For full-fidelity PDFs with rendered LaTeX equations and matching Jupyter styling, run the
            official <code className="font-mono">nbconvert</code> tool locally.
          </p>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Install</p>
            <pre className="overflow-x-auto rounded-md bg-muted/50 px-3 py-2 font-mono text-[11px] text-foreground">{`pip install nbconvert
# macOS:    brew install --cask mactex pandoc
# Ubuntu:   sudo apt install texlive-xetex pandoc`}</pre>
          </div>
          <div>
            <p className="font-semibold text-foreground/80 mb-1">Convert</p>
            <pre className="overflow-x-auto rounded-md bg-muted/50 px-3 py-2 font-mono text-[11px] text-foreground">{`jupyter nbconvert --to pdf your_notebook.ipynb

# Or skip the LaTeX dependency — uses Chromium under the hood:
jupyter nbconvert --to webpdf --allow-chromium-download your_notebook.ipynb`}</pre>
          </div>
          <p className="text-[11px]">
            <strong>Kaggle:</strong> download the notebook via File → Download Notebook, then convert locally. (
            <a
              href="https://www.kaggle.com/discussions/getting-started/529313"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              community thread
            </a>
            )
          </p>
        </div>
      </details>
    </main>
  );
}
