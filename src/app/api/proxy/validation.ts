import { z } from "zod";

export const MAX_URL_LENGTH = 2048;
export const MAX_HEADER_VALUE_LENGTH = 8192;
export const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PROXY_REDIRECTS = 5;

const ALLOWED_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

/** Headers that must not be forwarded to upstream (hop-by-hop / request smuggling). */
export const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "cookie",
]);

function parseDottedIpv4(hostname: string): number[] | null {
  const labels = hostname.split(".");
  if (labels.length !== 4) return null;
  if (!labels.every((p) => /^\d{1,3}$/.test(p))) return null;
  const parts = labels.map(Number);
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

/** Expand ::ffff:IPv4 / ::ffff:HHHH:HHHH to dotted IPv4, or null. */
function ipv4MappedFromV6(h: string): string | null {
  const dotted = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (dotted) return dotted[1];

  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const hi = parseInt(hex[1], 16);
  const lo = parseInt(hex[2], 16);
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function isPrivateIpv4Parts(parts: number[]): boolean {
  const [a, b] = parts;
  return (
    a === 10 || // RFC 1918 class A
    (a === 172 && b >= 16 && b <= 31) || // RFC 1918 class B
    (a === 192 && b === 168) || // RFC 1918 class C
    (a === 169 && b === 254) || // Link-local — includes cloud IMDS
    (a === 100 && b >= 64 && b <= 127) || // CGNAT (RFC 6598)
    a === 127 || // Loopback
    a === 0 || // "This" network
    a === 255 // Broadcast
  );
}

export function isPrivateAddress(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  const mapped = ipv4MappedFromV6(h);
  if (mapped) return isPrivateAddress(mapped);

  const dotted = parseDottedIpv4(h);
  if (dotted) return isPrivateIpv4Parts(dotted);

  // Integer / short IPv4 forms (e.g. 2130706433, 127.1) — some stacks resolve these.
  if (/^\d+$/.test(h) || /^\d+(\.\d+){1,2}$/.test(h)) return true;

  if (!h.includes(":")) return false;

  return (
    h === "::1" ||
    h === "::" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80:")
  );
}

export function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    BLOCKED_HOSTS.has(hostname) ||
    BLOCKED_HOSTS.has(normalized) ||
    BLOCKED_HOSTS.has(`[${normalized}]`) ||
    isPrivateAddress(hostname)
  );
}

export function isAllowedProxyUrl(urlString: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }
  if (isBlockedHost(url.hostname)) {
    return {
      ok: false,
      error: "Requests to private/internal addresses are not allowed.",
    };
  }
  return { ok: true, url };
}

export function sanitizeProxyHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

export const ProxyRequestSchema = z.object({
  url: z
    .string()
    .min(1, "url is required")
    .max(MAX_URL_LENGTH, `url must be at most ${MAX_URL_LENGTH} characters`)
    .refine((v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }, "Only http and https URLs are allowed"),
  method: z.enum(ALLOWED_METHODS, {
    error: `method must be one of: ${ALLOWED_METHODS.join(", ")}`,
  }),
  headers: z
    .record(z.string(), z.string().max(MAX_HEADER_VALUE_LENGTH))
    .optional()
    .default({}),
  payload: z.string().max(MAX_PAYLOAD_BYTES, "payload exceeds 10 MB limit").optional(),
});

export type ProxyRequest = z.infer<typeof ProxyRequestSchema>;
