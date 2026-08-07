// @vitest-environment node
import { describe, expect, it } from "vitest";
import { htmlToPlainText, notebookToPdf, toWinAnsiSafe } from "./notebook-to-pdf";
import type { Notebook } from "./notebook-to-html";

describe("htmlToPlainText", () => {
  it("strips tags and decodes entities", () => {
    expect(htmlToPlainText("<p>Hello <strong>world</strong>&amp;co</p>")).toBe("Hello world&co");
  });

  it("turns table cells into spaced text", () => {
    const t = htmlToPlainText(
      "<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>",
    );
    expect(t).toContain("a");
    expect(t).toContain("b");
    expect(t).toContain("c");
  });
});

describe("toWinAnsiSafe", () => {
  it("keeps ASCII and common WinAnsi punctuation", () => {
    // NFKC may expand compatibility chars (e.g. … → ...); keep euro / em dash.
    expect(toWinAnsiSafe("Hello — café €")).toBe("Hello — café €");
    expect(toWinAnsiSafe("world…")).toBe("world...");
  });

  it("replaces emoji and non-WinAnsi code points", () => {
    // U+1F3CF cricket bat — the reported download failure
    expect(toWinAnsiSafe("Score 🏏 end")).toBe("Score ? end");
    expect(toWinAnsiSafe("你好")).toBe("??");
  });
});

describe("notebookToPdf", () => {
  const sample: Notebook = {
    metadata: { kernelspec: { display_name: "Python 3", name: "python3" } },
    cells: [
      { cell_type: "markdown", source: "# Title\n\nHello **world**." },
      {
        cell_type: "code",
        execution_count: 1,
        source: "print(42)",
        outputs: [{ output_type: "stream", name: "stdout", text: "42\n" }],
      },
      {
        cell_type: "code",
        execution_count: 2,
        source: "df",
        outputs: [
          {
            output_type: "execute_result",
            data: {
              "text/html": "<table><tr><td>x</td><td>1</td></tr></table>",
              "text/plain": "x  1",
            },
          },
        ],
      },
    ],
  };

  it("produces a PDF with the expected header", async () => {
    const bytes = await notebookToPdf(sample, {
      includeCodeCells: true,
      includeOutputs: true,
      title: "Sample Notebook",
      scale: 0.75,
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    const head = String.fromCharCode(...bytes.slice(0, 5));
    expect(head).toBe("%PDF-");
  });

  it("respects includeCodeCells=false", async () => {
    const withCode = await notebookToPdf(sample, {
      includeCodeCells: true,
      includeOutputs: true,
      title: "A",
    });
    const noCode = await notebookToPdf(sample, {
      includeCodeCells: false,
      includeOutputs: true,
      title: "A",
    });
    expect(withCode.byteLength).toBeGreaterThan(noCode.byteLength);
  });

  it("embeds a tiny PNG from base64 output", async () => {
    // 1x1 red PNG
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const nb: Notebook = {
      cells: [
        {
          cell_type: "code",
          source: "plot()",
          outputs: [
            {
              output_type: "display_data",
              data: { "image/png": pngB64 },
            },
          ],
        },
      ],
    };
    const bytes = await notebookToPdf(nb, {
      includeCodeCells: true,
      includeOutputs: true,
      title: "Img",
    });
    expect(bytes.byteLength).toBeGreaterThan(800);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("succeeds when markdown/code/outputs contain emoji and non-WinAnsi chars", async () => {
    const nb: Notebook = {
      metadata: { kernelspec: { display_name: "Python 3 🐍", name: "python3" } },
      cells: [
        { cell_type: "markdown", source: "# Match day 🏏\n\n你好 — café" },
        {
          cell_type: "code",
          execution_count: 1,
          source: 'print("winner 🏆")',
          outputs: [
            {
              output_type: "stream",
              name: "stdout",
              text: "winner 🏆\n",
            },
            {
              output_type: "execute_result",
              data: { "text/plain": "日本語 output ✨" },
            },
          ],
        },
      ],
    };
    await expect(
      notebookToPdf(nb, {
        includeCodeCells: true,
        includeOutputs: true,
        title: "Emoji 🏏 Notebook",
        scale: 0.75,
      }),
    ).resolves.toBeInstanceOf(Uint8Array);

    const bytes = await notebookToPdf(nb, {
      includeCodeCells: true,
      includeOutputs: true,
      title: "Emoji 🏏 Notebook",
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("strips raw HTML tags from markdown instead of leaving them visible", async () => {
    const md =
      '# Hiring\n\n<div style="background-color: #1e3a8a;"><h2>Position: Senior DS</h2></div>\n\nHello';
    expect(htmlToPlainText(md)).toContain("Position: Senior DS");
    expect(htmlToPlainText(md)).not.toMatch(/<div/i);

    const nb: Notebook = {
      cells: [{ cell_type: "markdown", source: md }],
      metadata: { kernelspec: { display_name: "Python 3", name: "python3" } },
    };
    const bytes = await notebookToPdf(nb, {
      includeCodeCells: true,
      includeOutputs: true,
      title: "IPL",
    });
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});
