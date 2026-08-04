/**
 * Client-side (and Node-safe) notebook → PDF via pdf-lib.
 * Used when the serverless Chromium convert API is unavailable.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  joinSource,
  type NbCell,
  type NbOutput,
  type Notebook,
  type RenderOptions,
} from "@/lib/notebook-to-html";

const A4_W = 595.28;
const A4_H = 841.89;

export interface NotebookPdfOptions extends RenderOptions {
  /** 0.5–1.0 — scales fonts/margins similarly to the Puppeteer scale slider. */
  scale?: number;
  title?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Strip tags for PDF text drawing (tables become line-oriented plain text). */
export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|pre|blockquote)>/gi, "\n")
    .replace(/<\/td>/gi, "\t")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks)
    .replace(/\t+/g, "  ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function markdownToPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function wrapLine(text: string, measure: (s: string) => number, maxW: number): string[] {
  if (!text) return [""];
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current + word;
    if (measure(trial) <= maxW) {
      current = trial;
      continue;
    }
    if (current.trim()) lines.push(current.replace(/\s+$/, ""));
    current = word.replace(/^\s+/, "");
    if (measure(current) > maxW) {
      let acc = "";
      for (const ch of current) {
        if (measure(acc + ch) <= maxW) acc += ch;
        else {
          if (acc) lines.push(acc);
          acc = ch;
        }
      }
      current = acc;
    }
  }
  if (current.trim() || current === "") lines.push(current.replace(/\s+$/, ""));
  return lines.length ? lines : [""];
}

type ImageEmbed = { kind: "png" | "jpg"; bytes: Uint8Array };

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  if (typeof atob === "function") {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return Uint8Array.from(Buffer.from(clean, "base64"));
}

function extractOutputBlocks(output: NbOutput): { text?: string; image?: ImageEmbed }[] {
  const blocks: { text?: string; image?: ImageEmbed }[] = [];
  if (output.output_type === "stream") {
    blocks.push({ text: stripAnsi(joinSource(output.text ?? "")) });
    return blocks;
  }
  if (output.output_type === "error") {
    const tb = (output.traceback ?? []).map(stripAnsi).join("\n");
    const fallback = `${output.ename ?? "Error"}: ${output.evalue ?? ""}`.trim();
    blocks.push({ text: tb || fallback });
    return blocks;
  }
  if (output.output_type === "execute_result" || output.output_type === "display_data") {
    const data = output.data ?? {};
    if (data["image/png"]) {
      try {
        blocks.push({ image: { kind: "png", bytes: b64ToBytes(joinSource(data["image/png"])) } });
      } catch {
        /* skip corrupt */
      }
    } else if (data["image/jpeg"]) {
      try {
        blocks.push({ image: { kind: "jpg", bytes: b64ToBytes(joinSource(data["image/jpeg"])) } });
      } catch {
        /* skip corrupt */
      }
    } else if (data["text/html"]) {
      blocks.push({ text: htmlToPlainText(joinSource(data["text/html"])) });
    } else if (data["text/plain"]) {
      blocks.push({ text: stripAnsi(joinSource(data["text/plain"])) });
    } else if (data["image/svg+xml"]) {
      blocks.push({ text: "[SVG figure omitted in client PDF — use Print for full fidelity]" });
    }
  }
  return blocks;
}

function cellBlocks(cell: NbCell, opts: RenderOptions): { label?: string; text?: string; image?: ImageEmbed; mono?: boolean }[] {
  const blocks: { label?: string; text?: string; image?: ImageEmbed; mono?: boolean }[] = [];
  const src = joinSource(cell.source);

  if (cell.cell_type === "markdown") {
    blocks.push({ text: markdownToPlain(src) });
    return blocks;
  }
  if (cell.cell_type === "raw") {
    blocks.push({ text: src, mono: true });
    return blocks;
  }
  if (!opts.includeCodeCells) return blocks;

  const label = cell.execution_count != null ? `In [${cell.execution_count}]:` : "In [ ]:";
  blocks.push({ label, text: src, mono: true });

  if (opts.includeOutputs && cell.outputs?.length) {
    for (const out of cell.outputs) {
      for (const b of extractOutputBlocks(out)) {
        blocks.push({ ...b, mono: true });
      }
    }
  }
  return blocks;
}

/**
 * Build an A4 PDF from a parsed notebook. Pure JS — no Chromium / jupyter.
 */
export async function notebookToPdf(
  nb: Notebook,
  options: NotebookPdfOptions = { includeCodeCells: true, includeOutputs: true },
): Promise<Uint8Array> {
  const scale = Math.min(1, Math.max(0.5, options.scale ?? 0.75));
  const title = options.title?.trim() || "Notebook";
  const fontSize = 10 * scale;
  const monoSize = 9 * scale;
  const titleSize = 18 * scale;
  const lineGap = fontSize * 1.35;
  const monoGap = monoSize * 1.35;
  const margin = 48 * scale;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  let page: PDFPage = doc.addPage([A4_W, A4_H]);
  let y = A4_H - margin;
  const maxW = A4_W - 2 * margin;

  const newPage = () => {
    page = doc.addPage([A4_W, A4_H]);
    y = A4_H - margin;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) newPage();
  };

  const drawWrapped = (
    text: string,
    useFont: PDFFont,
    size: number,
    gap: number,
    color = rgb(0.1, 0.1, 0.1),
  ) => {
    const measure = (s: string) => useFont.widthOfTextAtSize(s, size);
    const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
    for (const para of paragraphs) {
      const lines = wrapLine(para, measure, maxW);
      for (const line of lines) {
        ensureSpace(gap);
        if (line) {
          page.drawText(line, {
            x: margin,
            y: y - size,
            size,
            font: useFont,
            color,
          });
        }
        y -= gap;
      }
    }
  };

  // Title
  ensureSpace(titleSize + 8);
  page.drawText(title.slice(0, 120), {
    x: margin,
    y: y - titleSize,
    size: titleSize,
    font: fontBold,
    color: rgb(0.07, 0.07, 0.07),
  });
  y -= titleSize + 6;

  const kernel = nb.metadata?.kernelspec?.display_name ?? nb.metadata?.kernelspec?.name;
  if (kernel) {
    drawWrapped(`Kernel: ${kernel}`, font, fontSize * 0.9, lineGap * 0.9, rgb(0.4, 0.4, 0.45));
    y -= 4;
  }

  for (const cell of nb.cells) {
    const parts = cellBlocks(cell, options);
    if (!parts.length) continue;
    y -= 8;
    for (const part of parts) {
      if (part.label) {
        ensureSpace(lineGap);
        page.drawText(part.label, {
          x: margin,
          y: y - fontSize,
          size: fontSize * 0.85,
          font: fontBold,
          color: rgb(0.75, 0.2, 0.2),
        });
        y -= lineGap;
      }
      if (part.image) {
        try {
          const img =
            part.image.kind === "png"
              ? await doc.embedPng(part.image.bytes)
              : await doc.embedJpg(part.image.bytes);
          const maxImgW = maxW;
          const maxImgH = A4_H * 0.45;
          let w = img.width;
          let h = img.height;
          const fit = Math.min(maxImgW / w, maxImgH / h, 1);
          w *= fit;
          h *= fit;
          ensureSpace(h + 8);
          page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
          y -= h + 8;
        } catch {
          drawWrapped("[Could not embed image]", font, fontSize, lineGap, rgb(0.5, 0.5, 0.5));
        }
      } else if (part.text != null && part.text.length) {
        drawWrapped(
          part.text,
          part.mono ? fontMono : font,
          part.mono ? monoSize : fontSize,
          part.mono ? monoGap : lineGap,
          part.mono ? rgb(0.15, 0.18, 0.22) : rgb(0.1, 0.1, 0.1),
        );
      }
    }
  }

  // Footer on last page
  page.drawText("Rendered by DevBench · client PDF", {
    x: margin,
    y: 24,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.65),
  });

  return doc.save();
}
