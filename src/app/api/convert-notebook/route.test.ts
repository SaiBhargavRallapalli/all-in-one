import { describe, expect, it, vi, afterEach } from "vitest";
import { parseNotebookJson, sanitizeDownloadFilename, shouldTryJupyter } from "./route";

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

describe("shouldTryJupyter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(shouldTryJupyter()).toBe(false);
  });

  it("skips when DEVBENCH_SKIP_JUPYTER=1", () => {
    vi.stubEnv("DEVBENCH_SKIP_JUPYTER", "1");
    expect(shouldTryJupyter()).toBe(false);
  });

  it("allows on bare metal when not skipped", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("AWS_LAMBDA_FUNCTION_NAME", "");
    vi.stubEnv("DEVBENCH_SKIP_JUPYTER", "");
    expect(shouldTryJupyter()).toBe(true);
  });
});
