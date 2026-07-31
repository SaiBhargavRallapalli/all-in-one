// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeHtml, sanitizeSvg } from "./sanitize-html";

describe("sanitizeHtml", () => {
  it("keeps safe markup", () => {
    const html = sanitizeHtml('<p class="x">Hello <strong>world</strong></p>');
    expect(html).toContain("<p");
    expect(html).toContain("<strong>world</strong>");
  });

  it("strips script tags", () => {
    const html = sanitizeHtml('<p>ok</p><script>alert(1)</script>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).toContain("<p>ok</p>");
  });

  it("strips event handlers", () => {
    const html = sanitizeHtml('<img src="https://example.com/a.png" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
    expect(html).toContain("example.com");
  });

  it("blocks javascript: links", () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(html).not.toContain("javascript:");
  });

  it("allows https links and data image URIs", () => {
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toContain('href="https://example.com"');
    expect(
      sanitizeHtml('<img alt="t" src="data:image/png;base64,abc">'),
    ).toContain("data:image/png;base64,abc");
  });
});

describe("sanitizeSvg", () => {
  it("strips script from SVG", () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>',
    );
    expect(svg).not.toContain("<script");
    expect(svg).toContain("circle");
  });

  it("keeps foreignObject for Mermaid labels", () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">Label</div></foreignObject></svg>',
    );
    expect(svg.toLowerCase()).toContain("foreignobject");
    expect(svg).toContain("Label");
  });

  it("strips on* handlers from SVG", () => {
    const svg = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="1" height="1"/></svg>',
    );
    expect(svg).not.toContain("onload");
  });
});
