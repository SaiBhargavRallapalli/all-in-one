import DOMPurify from "isomorphic-dompurify";

/** Safe schemes for anchors / media in tool-rendered HTML. */
const SAFE_URI_REGEXP =
  /^(?:(?:https?|mailto):|\/|#|data:image\/(?:png|jpeg|gif|webp|svg\+xml);)/i;

const HTML_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel", "class", "id"],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
};

const SVG_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  USE_PROFILES: { svg: true, svgFilters: true },
  // Mermaid 11 puts node labels inside <foreignObject>.
  ADD_TAGS: ["foreignObject"],
  ADD_ATTR: [
    "class",
    "id",
    "style",
    "xmlns",
    "viewBox",
    "fill",
    "stroke",
    "stroke-width",
    "d",
    "cx",
    "cy",
    "r",
    "x",
    "y",
    "width",
    "height",
    "transform",
    "text-anchor",
    "dominant-baseline",
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
};

/** Sanitize HTML fragments (markdown preview, notebook cell HTML outputs). */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, HTML_CONFIG);
}

/**
 * Sanitize SVG markup (Mermaid preview, notebook image/svg+xml outputs).
 * Keeps foreignObject for diagram labels; strips scripts and event handlers.
 */
export function sanitizeSvg(dirty: string): string {
  return DOMPurify.sanitize(dirty, SVG_CONFIG);
}
