import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

// CSP — written as an array for readability, joined into a single header value.
// Notes:
//   - 'unsafe-inline' on script-src is required for GTM's bootstrap snippet and
//     our inline JSON-LD <script>. Mitigated by the explicit allowlist below.
//   - 'wasm-unsafe-eval' lets @imgly/background-removal load its ONNX runtime.
//   - worker-src 'self' blob: is needed by the Lambda sandbox, which builds its
//     Web Worker source at runtime via URL.createObjectURL(new Blob([...])).
//   - frame-ancestors 'none' blocks clickjacking site-wide.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://*.googletagmanager.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.google https://*.gstatic.com https://*.doubleclick.net https://va.vercel-scripts.com https://*.vercel-insights.com https://fundingchoicesmessages.google.com",
  "style-src 'self' 'unsafe-inline' https://*.gstatic.com https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://*.gstatic.com https://cdn.jsdelivr.net",
  // Tool APIs: Cloudflare DoH, ipapi/ipify, npm registry, Frankfurter FX.
  // ws:/wss: — WebSocket tester connects to user-entered endpoints.
  "connect-src 'self' https://cdn.jsdelivr.net https://esm.sh https://pypi.org https://files.pythonhosted.org https://*.google.com https://*.google https://*.googletagmanager.com https://*.doubleclick.net https://*.googlesyndication.com https://va.vercel-scripts.com https://*.vercel-insights.com https://fundingchoicesmessages.google.com https://api.producthunt.com https://cloudflare-dns.com https://ipapi.co https://api.ipify.org https://registry.npmjs.org https://api.npmjs.org https://api.frankfurter.app ws: wss:",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src 'self' https://www.googletagmanager.com https://*.doubleclick.net https://*.google.com https://*.google https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// HSTS is duplicated in vercel.json as a safety net, but it MUST be set here
// too — the apex→www redirect (below in redirects()) runs inside Next.js and
// inherits headers() values. HSTS preload requires the apex response to carry
// `includeSubDomains; preload`.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// /embed/* pages must be frameable by any origin — override the two anti-framing headers.
const EMBED_CSP = CSP.replace("frame-ancestors 'none'", "frame-ancestors *");
const EMBED_HEADERS = [
  { key: "Content-Security-Policy", value: EMBED_CSP },
  { key: "X-Frame-Options", value: "ALLOWALL" },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle for the macOS desktop app (see packaging/desktop).
  ...(process.env.DESKTOP_BUILD === "1" ? { output: "standalone" as const } : {}),

  // Prevents readable source code appearing in browser DevTools on production
  productionBrowserSourceMaps: false,

  // Gzip responses (Vercel edge already does this; ensures coverage elsewhere)
  compress: true,

  // @imgly/background-removal fetches its ONNX model files from CDN at runtime,
  // so no special bundler rules are needed — an empty turbopack block suppresses
  // the "webpack config present but no turbopack config" warning in Next.js 16.
  turbopack: {},

  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      // Embed pages override the two anti-framing headers (rule applied after the general one)
      { source: "/embed/(.*)", headers: EMBED_HEADERS },
    ];
  },

  async redirects() {
    return [
      // Apex → www. Must be handled in Next.js (not Vercel's edge domain redirect)
      // so the 308 response carries the Strict-Transport-Security header from
      // headers() above. Required for HSTS preload eligibility on the apex.
      //
      // ⚠️ Pair this with a Vercel dashboard change: set devbench.co.in to
      //   "serve project" (not "redirect to www.devbench.co.in"). Otherwise this
      //   rule never fires because Vercel intercepts apex traffic first.
      {
        source: "/:path*",
        has: [{ type: "host", value: "devbench.co.in" }],
        destination: "https://www.devbench.co.in/:path*",
        permanent: true,
      },
      // Workspace tools: keep /tools/[slug] URLs working via permanent redirects.
      // Keep in sync with TOOL_SLUG_TO_WORKSPACE in src/lib/devbench-workspaces.ts.
      { source: "/tools/json-formatter", destination: "/json", permanent: true },
      { source: "/tools/yaml-to-json", destination: "/yaml", permanent: true },
      { source: "/tools/json-to-yaml", destination: "/yaml", permanent: true },
      { source: "/tools/yaml-formatter", destination: "/yaml", permanent: true },
      { source: "/tools/lambda-sandbox", destination: "/lambda-sandbox", permanent: true },
      { source: "/tools/webhook-simulator", destination: "/webhook-simulator", permanent: true },
      { source: "/tools/code-playground", destination: "/playground", permanent: true },
      { source: "/tools/epoch", destination: "/epoch", permanent: true },
      { source: "/tools/graph-calculator", destination: "/graph-calculator", permanent: true },
      { source: "/tools/linux-cheatsheet", destination: "/linux-cheatsheet", permanent: true },
      { source: "/tools/date-calculator", destination: "/date-calculator", permanent: true },
      { source: "/tools/jwt-debugger", destination: "/jwt-debugger", permanent: true },
      { source: "/tools/notepad-plus-plus", destination: "/notepad", permanent: true },
    ];
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
