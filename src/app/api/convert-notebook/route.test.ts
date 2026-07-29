import { describe, expect, it } from "vitest";
import { parseNotebookJson, sanitizeDownloadFilename } from "./route";

describe("sanitizeDownloadFilename", () => {
  it("converts .ipynb to .pdf", () => {
    expect(sanitizeDownloadFilename("report.ipynb")).toBe("report.pdf");
  });

  it("strips quotes and CRLF", () => {
    expect(sanitizeDownloadFilename('evil"\r\n.ipynb')).toBe("evil.pdf");
  });

  it("replaces path separators", () => {
    expect(sanitizeDownloadFilename("../etc/passwd.ipynb")).toBe(".._etc_passwd.pdf");
  });
});

describe("parseNotebookJson", () => {
  it("accepts a minimal notebook", () => {
    const nb = parseNotebookJson(JSON.stringify({ cells: [], metadata: {} }));
    expect(nb).not.toBeNull();
    expect(nb?.cells).toEqual([]);
  });

  it("rejects non-objects and missing cells", () => {
    expect(parseNotebookJson("not-json")).toBeNull();
    expect(parseNotebookJson("[]")).toBeNull();
    expect(parseNotebookJson("{}")).toBeNull();
    expect(parseNotebookJson(JSON.stringify({ cells: "nope" }))).toBeNull();
  });
});
