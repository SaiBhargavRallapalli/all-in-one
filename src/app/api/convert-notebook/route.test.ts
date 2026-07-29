import { describe, expect, it } from "vitest";
import { sanitizeDownloadFilename } from "./route";

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
