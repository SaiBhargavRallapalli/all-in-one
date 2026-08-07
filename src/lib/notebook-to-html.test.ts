// @vitest-environment node
import { describe, expect, it } from "vitest";
import { notebookToHtml, type Notebook } from "./notebook-to-html";

describe("notebookToHtml sanitization", () => {
  it("strips script from HTML outputs", () => {
    const nb: Notebook = {
      cells: [
        {
          cell_type: "code",
          source: "display(HTML(...))",
          outputs: [
            {
              output_type: "display_data",
              data: {
                "text/html": ['<p>ok</p><script>alert("xss")</script>'],
              },
            },
          ],
        },
      ],
    };
    const html = notebookToHtml(nb, "test", { includeCodeCells: true, includeOutputs: true });
    expect(html).toContain("<p>ok</p>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("neutralizes javascript: links in markdown cells", () => {
    const nb: Notebook = {
      cells: [
        {
          cell_type: "markdown",
          source: "[click](javascript:alert(1))",
        },
      ],
    };
    const html = notebookToHtml(nb, "test", { includeCodeCells: true, includeOutputs: true });
    expect(html).not.toContain("javascript:");
  });

  it("rejects attribute-breakout markdown image URLs", () => {
    const nb: Notebook = {
      cells: [
        {
          cell_type: "markdown",
          source: '![x](https://example.com/a.png" onerror="alert(1))',
        },
      ],
    };
    const html = notebookToHtml(nb, "test", { includeCodeCells: true, includeOutputs: true });
    expect(html).not.toMatch(/\sonerror=/i);
    expect(html).not.toContain("<img");
  });

  it("keeps safe https markdown images", () => {
    const nb: Notebook = {
      cells: [
        {
          cell_type: "markdown",
          source: "![chart](https://example.com/a.png)",
        },
      ],
    };
    const html = notebookToHtml(nb, "test", { includeCodeCells: true, includeOutputs: true });
    expect(html).toContain('<img alt="chart" src="https://example.com/a.png">');
  });

  it("passes through sanitized raw HTML blocks in markdown (Jupyter-style)", () => {
    const nb: Notebook = {
      cells: [
        {
          cell_type: "markdown",
          source: [
            "# Title\n\n",
            '<div style="background-color: #1e3a8a; color: white; padding: 20px;">\n',
            "<h2>Position: Senior Data Scientist</h2>\n",
            "</div>\n",
          ],
        },
      ],
    };
    const html = notebookToHtml(nb, "test", { includeCodeCells: true, includeOutputs: true });
    expect(html).toContain('style="background-color: #1e3a8a; color: white; padding: 20px;"');
    expect(html).toContain("<h2>Position: Senior Data Scientist</h2>");
    expect(html).not.toContain("&lt;div");
  });
});
