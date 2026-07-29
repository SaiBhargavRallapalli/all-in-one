import type { NextRequest } from "next/server";

/**
 * Browser Origin allowlist for DevBench API routes.
 * In production, a missing Origin is rejected (blocks curl/Postman open-relay abuse).
 * In development/test, null Origin is allowed for local tooling.
 */
const ALLOWED_ORIGIN_RE =
  /^https:\/\/(www\.devbench\.co\.in|devbench\.co\.in|[a-z0-9-]+\.devbench\.co\.in)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function isAllowedOrigin(origin: string | null): boolean {
  if (origin === null) {
    return process.env.NODE_ENV !== "production";
  }
  return ALLOWED_ORIGIN_RE.test(origin);
}

export function clientIpFromHeaders(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

export function clientIp(req: NextRequest | Request): string {
  return clientIpFromHeaders(req.headers);
}

/** Sliding-window rate limiter (in-memory, per warm instance). */
export function createRateLimiter(limit: number, windowMs = 60_000) {
  const rateLimitMap = new Map<string, number[]>();

  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (timestamps.length >= limit) return true;
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    return false;
  };
}
