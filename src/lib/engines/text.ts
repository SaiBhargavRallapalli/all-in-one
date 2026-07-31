// Copyright (c) 2026 DevBench contributors. MIT License.
import type { Result } from "./_shared";
import { sanitizeHtml } from "@/lib/sanitize-html";

export function caseConvert(input: string, targetCase: string): Result {
  const words = input.match(/[a-zA-Z0-9]+/g) || [];
  if (!words.length) return input;

  switch (targetCase) {
    case "camelCase":
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join("");
    case "PascalCase":
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("");
    case "snake_case":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab-case":
      return words.map((w) => w.toLowerCase()).join("-");
    case "UPPER_CASE":
      return words.map((w) => w.toUpperCase()).join("_");
    case "lower":
      return input.toLowerCase();
    case "Title":
      return input.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    case "Sentence":
      return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
    default:
      return input;
  }
}

export function slugify(input: string): Result {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function wordCount(input: string) {
  const text = input.trim();
  if (!text) return { words: 0, characters: 0, "characters (no spaces)": 0, sentences: 0, paragraphs: 0, "reading time": "0 min", "speaking time": "0 min" };
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const sentences = (text.match(/[.!?]+/g) || []).length || (text.length > 0 ? 1 : 0);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length || 1;
  const readingMin = Math.max(1, Math.ceil(words / 200));
  const speakingMin = Math.max(1, Math.ceil(words / 130));
  return {
    words,
    characters: chars,
    "characters (no spaces)": charsNoSpace,
    sentences,
    paragraphs,
    "reading time": `${readingMin} min`,
    "speaking time": `${speakingMin} min`,
  };
}

const LOREM_SENTENCES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
  "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
  "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit.",
  "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse.",
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.",
  "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit.",
  "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.",
  "Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis.",
  "Nulla facilisi morbi tempus iaculis urna id volutpat lacus laoreet.",
  "Viverra maecenas accumsan lacus vel facilisis volutpat est velit.",
];

const LOREM_WORDS = LOREM_SENTENCES.join(" ").split(/\s+/);

export function loremIpsum(count: number, unit: "paragraphs" | "sentences" | "words"): Result {
  count = Math.min(count, 50);
  if (unit === "words") {
    const result: string[] = [];
    for (let i = 0; i < count; i++) result.push(LOREM_WORDS[i % LOREM_WORDS.length]);
    return result.join(" ");
  }
  if (unit === "sentences") {
    const result: string[] = [];
    for (let i = 0; i < count; i++) result.push(LOREM_SENTENCES[i % LOREM_SENTENCES.length]);
    return result.join(" ");
  }
  const paras: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentCount = 4 + (p % 3);
    const para: string[] = [];
    for (let s = 0; s < sentCount; s++) {
      para.push(LOREM_SENTENCES[(p * sentCount + s) % LOREM_SENTENCES.length]);
    }
    paras.push(para.join(" "));
  }
  return paras.join("\n\n");
}

export function sortLines(input: string, mode: string): Result {
  const lines = input.split("\n");
  switch (mode) {
    case "asc":
      return lines.sort((a, b) => a.localeCompare(b)).join("\n");
    case "desc":
      return lines.sort((a, b) => b.localeCompare(a)).join("\n");
    case "reverse":
      return lines.reverse().join("\n");
    case "shuffle":
      for (let i = lines.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // lgtm[js/insecure-randomness] — visual shuffle, not a security token // CodeQL[js/insecure-randomness]
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      return lines.join("\n");
    case "unique": {
      const unique = [...new Set(lines)];
      const removed = lines.length - unique.length;
      return `${unique.join("\n")}\n\n--- Removed ${removed} duplicate(s) ---`;
    }
    default:
      return input;
  }
}

export function findReplace(
  input: string,
  find: string,
  replace: string,
  useRegex: boolean,
  caseInsensitive: boolean
): Result {
  if (!find) return input;
  try {
    if (useRegex) {
      const flags = "g" + (caseInsensitive ? "i" : "");
      const re = new RegExp(find, flags);
      const count = (input.match(re) || []).length;
      return { output: input.replace(re, replace), error: count === 0 ? "No matches found" : undefined };
    }
    const flags = caseInsensitive ? "gi" : "g";
    const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, flags);
    const count = (input.match(re) || []).length;
    return { output: input.replace(re, replace), error: count === 0 ? "No matches found" : undefined };
  } catch (e) {
    return { output: "", error: `Invalid regex: ${(e as Error).message}` };
  }
}

export function normalizeWhitespace(input: string, mode: string): Result {
  switch (mode) {
    case "collapse":
      return input.replace(/ {2,}/g, " ");
    case "trim":
      return input.split("\n").map((l) => l.trim()).join("\n");
    case "remove-blank":
      return input.split("\n").filter((l) => l.trim()).join("\n");
    case "single-space":
      return input.replace(/\s+/g, " ").trim();
    case "all":
      return input
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l)
        .map((l) => l.replace(/ {2,}/g, " "))
        .join("\n");
    default:
      return input;
  }
}

export function reverseString(input: string): Result {
  return [...input].reverse().join("");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Allow only safe link schemes and reject attribute-breakout characters. */
function sanitizeMarkdownHref(href: string): string {
  const trimmed = href.trim();
  if (!/^(https?:\/\/|\/|#|mailto:)/i.test(trimmed)) return "#";
  if (/["'<>`\s]/.test(trimmed)) return "#";
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return "#";
  return trimmed;
}

export function markdownToHtml(input: string): Result {
  // Escape HTML entities first to prevent XSS injection via raw HTML tags
  let html = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
    const safeHref = sanitizeMarkdownHref(String(href));
    return `<a href="${escapeHtmlAttr(safeHref)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>\n${m}</ul>\n`);
  html = html.replace(/^(?!<[hulo])((?!^\s*$).+)$/gm, "<p>$1</p>");
  return sanitizeHtml(html);
}

export function htmlToMarkdown(input: string): Result {
  let md = input;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1");
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1");
  md = md.replace(/<\/?[^>]+(>|$)/g, "");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

export function htmlToText(input: string): Result {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripMarkdown(input: string): Result {
  let text = input;
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*(.+?)\*\*/g, "$1");
  text = text.replace(/\*(.+?)\*/g, "$1");
  text = text.replace(/__(.+?)__/g, "$1");
  text = text.replace(/_(.+?)_/g, "$1");
  text = text.replace(/`(.+?)`/g, "$1");
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/\[(.+?)\]\(.+?\)/g, "$1");
  text = text.replace(/!\[.*?\]\(.+?\)/g, "");
  text = text.replace(/^[-*+]\s+/gm, "");
  text = text.replace(/^\d+\.\s+/gm, "");
  text = text.replace(/^>\s+/gm, "");
  text = text.replace(/---/g, "");
  return text.trim();
}

export function regexTest(_input: string, _pattern: string): Result {
  return { output: "", error: "Use the pattern option field above" };
}

export function textDiff(a: string, b: string): Result {
  if (!a && !b) return "";
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const result: string[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);

  let added = 0;
  let removed = 0;

  for (let i = 0; i < maxLen; i++) {
    const la = i < linesA.length ? linesA[i] : undefined;
    const lb = i < linesB.length ? linesB[i] : undefined;

    if (la === lb) {
      result.push(`  ${la}`);
    } else {
      if (la !== undefined) {
        result.push(`- ${la}`);
        removed++;
      }
      if (lb !== undefined) {
        result.push(`+ ${lb}`);
        added++;
      }
    }
  }

  result.unshift(`@@ ${added} addition(s), ${removed} removal(s) @@`);
  return result.join("\n");
}
