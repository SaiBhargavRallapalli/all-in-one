import { NextRequest, NextResponse } from "next/server";
import {
  ProxyRequestSchema,
  isAllowedProxyUrl,
  assertHostnameResolvesPublic,
  sanitizeProxyHeaders,
  MAX_PROXY_REDIRECTS,
} from "./validation";
import { clientIp, createRateLimiter, isAllowedOrigin } from "@/lib/api-guard";
import { logger } from "@/lib/logger";

const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 30_000;

// Sliding-window rate limiter: 20 req/min per IP.
// In-memory — per warm instance. Adequate for serverless abuse prevention.
const isRateLimited = createRateLimiter(20);

class ProxyBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProxyBlockedError";
  }
}

/**
 * Follow redirects manually so each hop is re-validated against the private-IP
 * / scheme allowlist (undici `redirect: "follow"` would skip those checks).
 */
async function fetchWithSafeRedirects(
  initialUrl: string,
  init: RequestInit,
  signal: AbortSignal,
): Promise<Response> {
  let currentUrl = initialUrl;
  let method = (init.method ?? "GET").toUpperCase();
  let body = init.body;
  const headers = init.headers;

  for (let hop = 0; hop <= MAX_PROXY_REDIRECTS; hop++) {
    const allowed = isAllowedProxyUrl(currentUrl);
    if (!allowed.ok) {
      throw new ProxyBlockedError(allowed.error);
    }

    const resolved = await assertHostnameResolvesPublic(allowed.url.hostname);
    if (!resolved.ok) {
      throw new ProxyBlockedError(resolved.error);
    }

    const response = await fetch(currentUrl, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
      signal,
      redirect: "manual",
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      return response;
    }

    // Consume body so the connection can be reused / closed cleanly.
    await response.arrayBuffer().catch(() => undefined);

    currentUrl = new URL(location, currentUrl).href;

    // Match browser/fetch semantics: 301/302/303 drop body and become GET.
    if ([301, 302, 303].includes(response.status) && method !== "GET" && method !== "HEAD") {
      method = "GET";
      body = undefined;
    }
  }

  throw new ProxyBlockedError("Too many redirects.");
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 20 requests per minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ProxyRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { url, method, headers, payload } = parsed.data;

  const initial = isAllowedProxyUrl(url);
  if (!initial.ok) {
    return NextResponse.json({ error: initial.error }, { status: 403 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const startTime = performance.now();

    const fetchOpts: RequestInit = {
      method: method.toUpperCase(),
      headers: sanitizeProxyHeaders(headers),
      signal: controller.signal,
    };

    if (payload && !["GET", "HEAD"].includes(method.toUpperCase())) {
      fetchOpts.body = payload;
    }

    const response = await fetchWithSafeRedirects(url, fetchOpts, controller.signal);
    const elapsed = Math.round(performance.now() - startTime);
    clearTimeout(timer);

    // Re-check final URL after any redirect chain (defense in depth).
    if (response.url) {
      const finalCheck = isAllowedProxyUrl(response.url);
      if (!finalCheck.ok) {
        return NextResponse.json({ error: finalCheck.error }, { status: 403 });
      }
      const finalResolved = await assertHostnameResolvesPublic(finalCheck.url.hostname);
      if (!finalResolved.ok) {
        return NextResponse.json({ error: finalResolved.error }, { status: 403 });
      }
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });

    const contentType = response.headers.get("content-type") || "";
    let responseBody: string;
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_BODY_SIZE) {
      responseBody = `[Response too large: ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB — truncated]`;
    } else {
      responseBody = new TextDecoder().decode(buffer);
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      contentType,
      time: elapsed,
      size: buffer.byteLength,
      redirected: response.url !== "" && response.url !== url,
      finalUrl: response.url || url,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ProxyBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("abort")) {
      logger.warn("/api/proxy", "Request timed out", { url, method });
      return NextResponse.json({ error: "Request timed out (30s limit)." }, { status: 504 });
    }
    logger.error("/api/proxy", "Fetch failed", { url, method, error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
