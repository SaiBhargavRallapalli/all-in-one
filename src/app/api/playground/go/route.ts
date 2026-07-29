import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, createRateLimiter, isAllowedOrigin } from "@/lib/api-guard";
import { logger } from "@/lib/logger";

const MAX_BYTES = 96_000;
const TIMEOUT_MS = 15_000;
const isRateLimited = createRateLimiter(20);

const PlaygroundSchema = z.object({
  code: z
    .string()
    .min(1, "Missing `code` string")
    .max(MAX_BYTES, "Code exceeds size limit"),
});

/** Ensure a compilable unit for the upstream playground (expects `body`, not `files`). */
function wrapGoBody(src: string): string {
  const t = src.trim();
  if (!t) return "package main\n\nfunc main() {}\n";
  if (/^\s*package\s+/m.test(src)) return src;
  return `package main\n\n${src}`;
}

/**
 * Proxies to https://go.dev/_/compile (JSON `version` + `body`).
 * Unique User-Agent per https://go.dev/blog/playground "Other clients".
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 20 requests per minute." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PlaygroundSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { code } = parsed.data;

  const body = wrapGoBody(code);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch("https://go.dev/_/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "DevBench-Playground/1.0 (https://www.devbench.co.in/playground)",
      },
      body: JSON.stringify({ version: 2, body }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "Upstream request failed";
    if (msg.includes("abort")) {
      logger.warn("/api/playground/go", "Upstream timed out");
      return NextResponse.json({ error: "Playground request timed out." }, { status: 504 });
    }
    logger.error("/api/playground/go", "Upstream fetch failed", { error: msg });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  clearTimeout(timer);

  if (!upstream.ok) {
    logger.warn("/api/playground/go", "Upstream returned non-OK", { status: upstream.status });
    return NextResponse.json({ error: `Playground returned ${upstream.status}` }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    logger.error("/api/playground/go", "Failed to parse upstream JSON");
    return NextResponse.json({ error: "Invalid response from playground" }, { status: 502 });
  }

  const o = data as {
    Errors?: string;
    Events?: Array<{ Message?: string; Kind?: string }>;
  };

  const lines: string[] = [];
  if (o.Errors?.trim()) lines.push(o.Errors.trim());
  if (Array.isArray(o.Events)) {
    for (const ev of o.Events) {
      const msg = typeof ev.Message === "string" ? ev.Message.replace(/\r\n/g, "\n") : "";
      if (!msg) continue;
      const kind = typeof ev.Kind === "string" ? ev.Kind : "stdout";
      if (kind === "stderr") lines.push(`[stderr] ${msg}`);
      else lines.push(msg);
    }
  }

  const output = lines.join("\n").trimEnd() || "(no output)";
  return NextResponse.json({ output });
}
