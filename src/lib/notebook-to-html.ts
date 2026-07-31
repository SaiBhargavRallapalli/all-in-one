// Shared notebook → HTML renderer used by both the client preview and the
// server-side PDF API route (as the fallback when jupyter is not available).

import { sanitizeHtml, sanitizeSvg } from "@/lib/sanitize-html";

export interface NbCell {
  cell_type: "markdown" | "code" | "raw";
  source: string | string[];
  execution_count?: number | null;
  outputs?: NbOutput[];
}

export interface NbOutput {
  output_type: "stream" | "execute_result" | "display_data" | "error";
  name?: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface Notebook {
  cells: NbCell[];
  metadata?: { kernelspec?: { display_name?: string; name?: string } };
}

export interface RenderOptions {
  includeCodeCells: boolean;
  includeOutputs: boolean;
}

// ─── Utilities ──────────────────────────────────────────────────────────

const ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/g;

export function joinSource(src: string | string[]): string {
  return Array.isArray(src) ? src.join("") : src;
}

function stripAnsi(s: string): string {
  return s.replace(ANSI_ESCAPE_RE, "");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow only safe URL schemes; reject attribute-breakout characters. */
function sanitizeMdUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^(https?:\/\/|\/|#|mailto:|data:image\/)/i.test(trimmed)) return "";
  if (/["'<>`\s]/.test(trimmed)) return "";
  if (/^(javascript|vbscript):/i.test(trimmed)) return "";
  return trimmed;
}

// ─── Lightweight markdown → HTML ────────────────────────────────────────

function inlineMarkdown(s: string): string {
  let html = escapeHtml(s);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\b__([^_\n]+?)__\b/g, "<strong>$1</strong>");
  html = html.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
  html = html.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, rawUrl) => {
    const src = sanitizeMdUrl(String(rawUrl));
    if (!src) return escapeHtml(String(alt || ""));
    return `<img alt="${escapeHtml(String(alt))}" src="${escapeHtml(src)}">`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, rawUrl) => {
    const href = sanitizeMdUrl(String(rawUrl));
    if (!href) return String(text);
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${text}</a>`;
  });
  return html;
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (!buf.length) return;
    const text = buf.join(" ").trim();
    if (text) out.push(`<p>${inlineMarkdown(text)}</p>`);
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];

    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        `<pre class="md-code${lang ? ` lang-${escapeHtml(lang)}` : ""}"><code>${escapeHtml(
          codeLines.join("\n")
        )}</code></pre>`
      );
      continue;
    }

    const head = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (head) {
      const lvl = head[1].length;
      out.push(`<h${lvl}>${inlineMarkdown(head[2])}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*[-*+]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inlineMarkdown(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inlineMarkdown(qLines.join(" "))}</blockquote>`);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+|^```|^\s*[-*+]\s+|^\s*\d+\.\s+|^>\s?/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    flushParagraph(paraLines);
  }

  return out.join("\n");
}

// ─── Sanitise raw HTML outputs ───────────────────────────────────────────

/** Strip Colab chrome, then DOMPurify (scripts, handlers, javascript: URIs). */
function sanitizeNotebookHtml(html: string): string {
  const withoutColab = html
    .replace(/<div class="colab-df-buttons"[\s\S]*?<\/div>/g, "")
    .replace(/<button class="colab-df-[\s\S]*?<\/button>/g, "")
    .replace(/<div class="colab-df-[^"]*"[\s\S]*?<\/div>/g, "");
  return sanitizeHtml(withoutColab);
}

// ─── Cell → HTML ─────────────────────────────────────────────────────────

function renderOutputHtml(output: NbOutput): string {
  if (output.output_type === "stream") {
    const text = stripAnsi(joinSource(output.text ?? ""));
    const cls = output.name === "stderr" ? "out-stream out-stderr" : "out-stream";
    return `<pre class="${cls}">${escapeHtml(text)}</pre>`;
  }
  if (output.output_type === "execute_result" || output.output_type === "display_data") {
    const data = output.data ?? {};
    if (data["text/html"]) {
      return `<div class="out-html">${sanitizeNotebookHtml(joinSource(data["text/html"]))}</div>`;
    }
    if (data["image/png"]) {
      const b64 = joinSource(data["image/png"]).replace(/\s+/g, "");
      return `<div class="out-image"><img alt="Cell output" src="data:image/png;base64,${b64}" /></div>`;
    }
    if (data["image/jpeg"]) {
      const b64 = joinSource(data["image/jpeg"]).replace(/\s+/g, "");
      return `<div class="out-image"><img alt="Cell output" src="data:image/jpeg;base64,${b64}" /></div>`;
    }
    if (data["image/svg+xml"]) {
      return `<div class="out-image">${sanitizeSvg(joinSource(data["image/svg+xml"]))}</div>`;
    }
    if (data["text/plain"]) {
      return `<pre class="out-text">${escapeHtml(stripAnsi(joinSource(data["text/plain"])))}</pre>`;
    }
  }
  if (output.output_type === "error") {
    const tb = (output.traceback ?? []).map(stripAnsi).join("\n");
    const fallback = `${output.ename ?? "Error"}: ${output.evalue ?? ""}`.trim();
    return `<pre class="out-error">${escapeHtml(tb || fallback)}</pre>`;
  }
  return "";
}

function renderCellHtml(cell: NbCell, opts: RenderOptions): string {
  const src = joinSource(cell.source);

  if (cell.cell_type === "markdown") {
    return `<div class="cell markdown-cell">${sanitizeHtml(markdownToHtml(src))}</div>`;
  }
  if (cell.cell_type === "raw") {
    return `<div class="cell raw-cell"><pre>${escapeHtml(src)}</pre></div>`;
  }

  if (!opts.includeCodeCells) return "";

  const execLabel =
    cell.execution_count != null
      ? `In&nbsp;[${cell.execution_count}]:`
      : "In&nbsp;[&nbsp;]:";
  const sourceHtml = `<pre class="code-source"><code>${escapeHtml(src)}</code></pre>`;
  const outputsHtml =
    opts.includeOutputs && cell.outputs?.length
      ? cell.outputs.map(renderOutputHtml).join("\n")
      : "";

  return `<div class="cell code-cell">
    <div class="cell-body">
      <div class="cell-label cell-label-in">${execLabel}</div>
      <div class="cell-content">${sourceHtml}</div>
    </div>
    ${outputsHtml ? `<div class="cell-outputs"><div class="cell-body"><div class="cell-label cell-label-out"></div><div class="cell-content">${outputsHtml}</div></div></div>` : ""}
  </div>`;
}

// ─── Styles ───────────────────────────────────────────────────────────────

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #ffffff; color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px; line-height: 1.55; -webkit-font-smoothing: antialiased;
  }
  .nb-root { max-width: 880px; margin: 0 auto; padding: 32px 40px; }
  .nb-title { font-size: 26px; font-weight: 700; margin: 0 0 4px; color: #111; }
  .nb-kernel { font-size: 12px; color: #6b7280; margin: 0 0 28px; }
  .cell { margin-bottom: 16px; }
  .cell-body { display: grid; grid-template-columns: 76px 1fr; gap: 8px; align-items: start; }
  .cell-label {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px; color: #c53030; padding-top: 8px;
    text-align: right; user-select: none; white-space: nowrap;
  }
  .cell-label-out { color: transparent; }
  .cell-content { min-width: 0; }
  .code-source {
    background: #f5f7fb; border: 1px solid #e5e9f2; border-radius: 4px;
    padding: 8px 12px; margin: 0; overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 13px; line-height: 1.5; color: #1f2937; white-space: pre;
  }
  .code-source code { font: inherit; background: none; padding: 0; }
  .cell-outputs { margin-top: 6px; }
  .out-stream, .out-text {
    background: #fafbfc; border: 1px solid #eceef2; border-radius: 4px;
    padding: 6px 12px; margin: 0 0 6px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px; line-height: 1.55; color: #2d3748;
    white-space: pre-wrap; word-break: break-word; overflow-x: auto;
  }
  .out-stderr { background: #fff5f5; border-color: #fed7d7; color: #c53030; }
  .out-error {
    background: #fff5f5; border: 1px solid #feb2b2; border-radius: 4px;
    padding: 8px 12px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 12px; color: #9b2c2c; white-space: pre-wrap; margin: 0 0 6px;
  }
  .out-image { margin: 4px 0 10px; text-align: left; }
  .out-image img, .out-image svg { max-width: 100%; height: auto; display: block; }
  .out-html { margin: 4px 0 10px; overflow-x: auto; }
  .out-html table, .markdown-cell table { border-collapse: collapse; margin: 6px 0; font-size: 12px; }
  .out-html th, .out-html td, .markdown-cell th, .markdown-cell td {
    border: 1px solid #dfe3eb; padding: 4px 10px; text-align: left;
  }
  .out-html thead th { background: #f4f6fa; font-weight: 600; }
  .markdown-cell h1,.markdown-cell h2,.markdown-cell h3,
  .markdown-cell h4,.markdown-cell h5,.markdown-cell h6 {
    color: #111; margin: 18px 0 8px; line-height: 1.3; font-weight: 600;
  }
  .markdown-cell h1 { font-size: 22px; } .markdown-cell h2 { font-size: 19px; }
  .markdown-cell h3 { font-size: 16px; } .markdown-cell h4 { font-size: 14px; }
  .markdown-cell p { margin: 6px 0; }
  .markdown-cell ul, .markdown-cell ol { padding-left: 22px; margin: 6px 0; }
  .markdown-cell li { margin: 2px 0; }
  .markdown-cell code {
    background: #f5f7fb; border: 1px solid #e5e9f2; border-radius: 3px;
    padding: 1px 5px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  .markdown-cell pre.md-code {
    background: #f5f7fb; border: 1px solid #e5e9f2; border-radius: 4px;
    padding: 10px 14px; overflow-x: auto; margin: 8px 0; font-size: 13px;
  }
  .markdown-cell pre.md-code code { background: none; border: 0; padding: 0; }
  .markdown-cell a { color: #4f46e5; text-decoration: underline; }
  .markdown-cell blockquote {
    border-left: 3px solid #e5e9f2; padding-left: 12px; color: #4b5563; margin: 8px 0;
  }
  .markdown-cell img { max-width: 100%; height: auto; }
  .nb-footer {
    margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e9f2;
    font-size: 11px; color: #9ca3af; text-align: center;
  }
  @media print {
    body { font-size: 11px; }
    .nb-root { max-width: 100%; padding: 0; }
    .cell { break-inside: avoid; }
    .out-image, .out-html { break-inside: avoid; }
    .nb-footer { break-before: avoid; }
    @page { margin: 14mm 12mm; }
  }
`;

// ─── Public API ───────────────────────────────────────────────────────────

export function notebookToHtml(nb: Notebook, title: string, opts: RenderOptions): string {
  const kernel = nb.metadata?.kernelspec?.display_name ?? nb.metadata?.kernelspec?.name;
  const cellsHtml = nb.cells.map((cell) => renderCellHtml(cell, opts)).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="nb-root">
    <h1 class="nb-title">${escapeHtml(title)}</h1>
    ${kernel ? `<p class="nb-kernel">Kernel: ${escapeHtml(kernel)}</p>` : ""}
    ${cellsHtml}
    <div class="nb-footer">Rendered by DevBench · devbench.co.in/tools/ipynb-to-pdf</div>
  </div>
</body>
</html>`;
}
