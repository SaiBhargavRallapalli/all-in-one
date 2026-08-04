/**
 * Lightweight HTML/SVG sanitizer for paths that must not pull in
 * isomorphic-dompurify/jsdom (Vercel serverless: ERR_REQUIRE_ESM via @exodus/bytes).
 * Strips scripts, event handlers, and dangerous URIs. Prefer sanitize-html.ts
 * (DOMPurify) when a real DOM is available (Mermaid, markdown preview).
 */

const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_HREF_RE = /\s(href|xlink:href|action|formaction)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi;
const JS_HREF_UNQUOTED_RE = /\s(href|xlink:href|action|formaction)\s*=\s*javascript:[^\s>]*/gi;
const DATA_NON_IMAGE_RE =
  /\s(src|href)\s*=\s*(["'])\s*data:(?!image\/(?:png|jpeg|jpg|gif|webp|svg\+xml))[^"']*\2/gi;

export function sanitizeHtmlLite(dirty: string): string {
  return dirty
    .replace(SCRIPT_RE, "")
    .replace(EVENT_ATTR_RE, "")
    .replace(JS_HREF_RE, ' $1="#"')
    .replace(JS_HREF_UNQUOTED_RE, ' $1="#"')
    .replace(DATA_NON_IMAGE_RE, "");
}

export function sanitizeSvgLite(dirty: string): string {
  return sanitizeHtmlLite(dirty);
}
