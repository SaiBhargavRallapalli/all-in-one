"use client";

import { useState } from "react";
import { Monitor, Code2, AlertCircle, ArrowLeftRight } from "lucide-react";
import ToolPageHero from "@/components/tools/ToolPageHero";
import type { Tool } from "@/lib/tools-registry";

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { color: #6366f1; margin-bottom: 0.5rem; }
    p { color: #64748b; line-height: 1.6; }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1.25rem;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    }
    button:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Edit the HTML on the left to see live changes here. Enable JavaScript to run scripts.</p>
  <button onclick="alert('JS is enabled!')">Test JavaScript</button>
</body>
</html>`;

type View = "split" | "code" | "preview";

export default function HtmlPreviewTool({ tool }: { tool: Tool }) {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [allowJs, setAllowJs] = useState(false);
  const [view, setView] = useState<View>("split");

  // Never combine allow-scripts with allow-same-origin on srcDoc — that would
  // give the iframe the parent origin and let untrusted HTML escape the sandbox.
  // allow-scripts alone runs in an opaque unique origin (safe for previews).
  const sandbox = allowJs ? "allow-scripts allow-modals allow-forms" : "";

  return (
    <div className="min-h-screen bg-background">
      <ToolPageHero tool={tool} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
            {(["split", "code", "preview"] as View[]).map((v) => {
              const icons: Record<View, React.ElementType> = {
                split: ArrowLeftRight,
                code: Code2,
                preview: Monitor,
              };
              const Icon = icons[v];
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 capitalize transition-colors ${
                    view === v
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v}
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={allowJs}
              onChange={(e) => setAllowJs(e.target.checked)}
              className="rounded"
            />
            Allow JavaScript
          </label>

          {allowJs && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              JS enabled — only use trusted HTML
            </span>
          )}
        </div>

        {/* Panels */}
        <div
          className={`grid gap-4 h-[640px] ${
            view === "split" ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {(view === "split" || view === "code") && (
            <div className="flex flex-col rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                <Code2 className="w-3.5 h-3.5" />
                HTML Source
                <span className="ml-auto">{html.length} chars</span>
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="flex-1 p-4 font-mono text-sm bg-background resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {(view === "split" || view === "preview") && (
            <div className="flex flex-col rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                <Monitor className="w-3.5 h-3.5" />
                Preview
                {!allowJs && (
                  <span className="ml-auto text-muted-foreground">sandbox — no scripts</span>
                )}
              </div>
              <iframe
                srcDoc={html}
                sandbox={sandbox}
                className="flex-1 bg-white"
                title="HTML Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
