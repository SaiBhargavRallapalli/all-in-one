// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeHtmlLite, sanitizeSvgLite } from "./sanitize-html-lite";

describe("sanitizeHtmlLite", () => {
  it("strips script tags", () => {
    const html = sanitizeHtmlLite('<p>ok</p><script>alert(1)</script>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).toContain("<p>ok</p>");
  });

  it("strips event handlers", () => {
    const html = sanitizeHtmlLite('<img src="https://example.com/a.png" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
    expect(html).toContain("example.com");
  });

  it("neutralizes javascript: hrefs", () => {
    expect(sanitizeHtmlLite('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
  });
});

describe("sanitizeSvgLite", () => {
  it("strips script from SVG", () => {
    const svg = sanitizeSvgLite(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>',
    );
    expect(svg).not.toContain("<script");
    expect(svg).toContain("circle");
  });
});
