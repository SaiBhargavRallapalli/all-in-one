import { describe, it, expect } from "vitest";
import {
  isPrivateAddress,
  isBlockedHost,
  isAllowedProxyUrl,
  sanitizeProxyHeaders,
  ProxyRequestSchema,
  MAX_URL_LENGTH,
  MAX_HEADER_VALUE_LENGTH,
  MAX_PAYLOAD_BYTES,
} from "./validation";

describe("isPrivateAddress", () => {
  it("blocks 10.x.x.x", () => expect(isPrivateAddress("10.0.0.1")).toBe(true));
  it("blocks 172.16.x.x", () => expect(isPrivateAddress("172.16.0.1")).toBe(true));
  it("blocks 172.31.x.x", () => expect(isPrivateAddress("172.31.255.255")).toBe(true));
  it("allows 172.32.x.x", () => expect(isPrivateAddress("172.32.0.1")).toBe(false));
  it("blocks 192.168.x.x", () => expect(isPrivateAddress("192.168.1.1")).toBe(true));
  it("blocks 169.254.x.x (link-local)", () => expect(isPrivateAddress("169.254.0.1")).toBe(true));
  it("blocks 100.64.x.x (CGNAT)", () => expect(isPrivateAddress("100.64.0.1")).toBe(true));
  it("blocks ::1", () => expect(isPrivateAddress("::1")).toBe(true));
  it("blocks fc00:: (ULA)", () => expect(isPrivateAddress("fc00::1")).toBe(true));
  it("blocks fe80:: (link-local)", () => expect(isPrivateAddress("fe80::1")).toBe(true));
  it("blocks IPv4-mapped loopback", () =>
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true));
  it("blocks IPv4-mapped hex loopback", () =>
    expect(isPrivateAddress("::ffff:7f00:1")).toBe(true));
  it("blocks decimal/integer IPv4 forms", () =>
    expect(isPrivateAddress("2130706433")).toBe(true));
  it("blocks short IPv4 forms", () => expect(isPrivateAddress("127.1")).toBe(true));
  it("allows public IPv4", () => expect(isPrivateAddress("8.8.8.8")).toBe(false));
  it("allows public IPv6", () => expect(isPrivateAddress("2001:db8::1")).toBe(false));
});

describe("isBlockedHost", () => {
  it("blocks localhost", () => expect(isBlockedHost("localhost")).toBe(true));
  it("blocks 127.0.0.1", () => expect(isBlockedHost("127.0.0.1")).toBe(true));
  it("blocks 0.0.0.0", () => expect(isBlockedHost("0.0.0.0")).toBe(true));
  it("blocks [::1]", () => expect(isBlockedHost("[::1]")).toBe(true));
  it("blocks private range via isPrivateAddress", () =>
    expect(isBlockedHost("192.168.0.1")).toBe(true));
  it("allows public domain", () => expect(isBlockedHost("api.example.com")).toBe(false));
  it("allows public IP", () => expect(isBlockedHost("8.8.8.8")).toBe(false));
});

describe("isAllowedProxyUrl", () => {
  it("accepts https public URLs", () => {
    expect(isAllowedProxyUrl("https://api.example.com/x").ok).toBe(true);
  });

  it("rejects ftp", () => {
    const r = isAllowedProxyUrl("ftp://example.com/file");
    expect(r.ok).toBe(false);
  });

  it("rejects private hosts", () => {
    const r = isAllowedProxyUrl("http://169.254.169.254/latest/meta-data/");
    expect(r.ok).toBe(false);
  });
});

describe("sanitizeProxyHeaders", () => {
  it("strips hop-by-hop and Host headers", () => {
    expect(
      sanitizeProxyHeaders({
        Host: "evil.internal",
        "Transfer-Encoding": "chunked",
        Authorization: "Bearer t",
        "X-Custom": "ok",
      }),
    ).toEqual({
      Authorization: "Bearer t",
      "X-Custom": "ok",
    });
  });
});

describe("ProxyRequestSchema", () => {
  const valid = {
    url: "https://api.example.com/data",
    method: "GET",
  };

  it("accepts minimal valid request", () => {
    expect(ProxyRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all allowed methods", () => {
    const methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
    for (const method of methods) {
      expect(ProxyRequestSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
  });

  it("rejects unknown method", () => {
    const r = ProxyRequestSchema.safeParse({ ...valid, method: "TRACE" });
    expect(r.success).toBe(false);
  });

  it("rejects missing url", () => {
    const r = ProxyRequestSchema.safeParse({ method: "GET" });
    expect(r.success).toBe(false);
  });

  it("rejects url exceeding MAX_URL_LENGTH", () => {
    const r = ProxyRequestSchema.safeParse({ ...valid, url: "https://x.com/" + "a".repeat(MAX_URL_LENGTH) });
    expect(r.success).toBe(false);
  });

  it("rejects header value exceeding MAX_HEADER_VALUE_LENGTH", () => {
    const r = ProxyRequestSchema.safeParse({
      ...valid,
      headers: { "x-custom": "x".repeat(MAX_HEADER_VALUE_LENGTH + 1) },
    });
    expect(r.success).toBe(false);
  });

  it("rejects payload exceeding MAX_PAYLOAD_BYTES", () => {
    const r = ProxyRequestSchema.safeParse({
      ...valid,
      method: "POST",
      payload: "x".repeat(MAX_PAYLOAD_BYTES + 1),
    });
    expect(r.success).toBe(false);
  });

  it("defaults headers to empty object when omitted", () => {
    const r = ProxyRequestSchema.safeParse(valid);
    expect(r.success && r.data.headers).toEqual({});
  });

  it("rejects non-http/https url", () => {
    const r = ProxyRequestSchema.safeParse({ ...valid, url: "ftp://example.com/file" });
    expect(r.success).toBe(false);
  });

  it("rejects malformed url string", () => {
    const r = ProxyRequestSchema.safeParse({ ...valid, url: "not-a-url" });
    expect(r.success).toBe(false);
  });
});
