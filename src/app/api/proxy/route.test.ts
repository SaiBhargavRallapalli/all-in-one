// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]),
}));
vi.mock("dns/promises", () => ({
  lookup: lookupMock,
  default: { lookup: lookupMock },
}));

function makeRequest(body: unknown, ip = "1.2.3.4", origin?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };
  if (origin !== null) {
    headers.Origin = origin ?? "http://localhost:3000";
  }
  return new NextRequest("http://localhost/api/proxy", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
}

function mockFetchResponse(opts: {
  status?: number;
  body?: string;
  contentType?: string;
  headers?: Record<string, string>;
}) {
  const { status = 200, body = "{}", contentType = "application/json", headers = {} } = opts;
  const responseHeaders = new Headers({ "content-type": contentType, ...headers });
  const buffer = new TextEncoder().encode(body).buffer;
  return {
    status,
    statusText: "OK",
    ok: status >= 200 && status < 300,
    headers: responseHeaders,
    arrayBuffer: vi.fn().mockResolvedValue(buffer),
    url: "https://api.example.com/data",
    redirected: false,
  } as unknown as Response;
}

describe("POST /api/proxy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 as const }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects foreign Origin", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ url: "https://api.example.com/", method: "GET" }, "9.9.9.0", "https://evil.example.com"),
    );
    expect(res.status).toBe(403);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("rejects missing Origin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ url: "https://api.example.com/", method: "GET" }, "9.9.9.20", null),
    );
    expect(res.status).toBe(403);
  });

  it("blocks when DNS resolves to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 as const }]);
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ url: "https://rebinder.example.com/", method: "GET" }, "9.9.9.21"),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/private|internal/i);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("returns 400 for non-JSON body", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/proxy", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "text/plain", "x-forwarded-for": "9.9.9.1" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 for unknown HTTP method", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ url: "https://example.com", method: "TRACE" }, "9.9.9.2"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/method/i);
  });

  it("returns 400 for malformed URL", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ url: "not-a-url", method: "GET" }, "9.9.9.3"));
    expect(res.status).toBe(400);
  });

  it("returns 403 for localhost", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ url: "http://localhost/secret", method: "GET" }, "9.9.9.4"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/private|internal/i);
  });

  it("returns 403 for 127.0.0.1", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ url: "http://127.0.0.1:8080/admin", method: "GET" }, "9.9.9.5"));
    expect(res.status).toBe(403);
  });

  it("returns 403 for private RFC-1918 address", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ url: "http://192.168.1.1/", method: "GET" }, "9.9.9.6"));
    expect(res.status).toBe(403);
  });

  it("proxies a successful GET and returns response shape", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ body: '{"ok":true}' }));

    const res = await POST(makeRequest({ url: "https://api.example.com/data", method: "GET" }, "9.9.9.7"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      status: 200,
      body: '{"ok":true}',
      contentType: "application/json",
    });
    expect(typeof json.time).toBe("number");
    expect(typeof json.size).toBe("number");
  });

  it("forwards payload on POST", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ body: '{"created":true}', status: 201 }));

    const res = await POST(
      makeRequest(
        { url: "https://api.example.com/items", method: "POST", payload: '{"name":"test"}' },
        "9.9.9.8",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe(201);

    const [, fetchInit] = vi.mocked(fetch).mock.calls[0];
    expect((fetchInit as RequestInit).body).toBe('{"name":"test"}');
  });

  it("does not send body for GET requests", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({}));

    await POST(
      makeRequest(
        { url: "https://api.example.com/data", method: "GET", payload: "ignored" },
        "9.9.9.9",
      ),
    );

    const [, fetchInit] = vi.mocked(fetch).mock.calls[0];
    expect((fetchInit as RequestInit).body).toBeUndefined();
  });

  it("returns 502 when upstream fetch throws", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockRejectedValue(new Error("connection refused"));

    const res = await POST(makeRequest({ url: "https://api.example.com/", method: "GET" }, "9.9.9.10"));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/connection refused/i);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.resetModules();
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({}));

    const ip = "10.20.30.40";
    // Exhaust the 20 req/min limit
    for (let i = 0; i < 20; i++) {
      await POST(makeRequest({ url: "https://api.example.com/", method: "GET" }, ip));
    }
    const res = await POST(makeRequest({ url: "https://api.example.com/", method: "GET" }, ip));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/rate limit/i);
  });

  it("blocks redirects that land on private addresses", async () => {
    vi.resetModules();
    const { POST } = await import("./route");

    vi.mocked(fetch).mockResolvedValueOnce({
      status: 302,
      statusText: "Found",
      ok: false,
      headers: new Headers({ location: "http://169.254.169.254/latest/meta-data/" }),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      url: "https://evil.example.com/redirect",
      redirected: false,
    } as unknown as Response);

    const res = await POST(
      makeRequest({ url: "https://evil.example.com/redirect", method: "GET" }, "9.9.9.11"),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/private|internal/i);
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
  });

  it("uses redirect: manual so hops can be re-validated", async () => {
    const { POST } = await import("./route");
    vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ body: '{"ok":true}' }));

    await POST(makeRequest({ url: "https://api.example.com/data", method: "GET" }, "9.9.9.12"));

    const [, fetchInit] = vi.mocked(fetch).mock.calls[0];
    expect((fetchInit as RequestInit).redirect).toBe("manual");
  });

  it("rejects ftp URLs before fetch", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest({ url: "ftp://example.com/file", method: "GET" }, "9.9.9.13"),
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
