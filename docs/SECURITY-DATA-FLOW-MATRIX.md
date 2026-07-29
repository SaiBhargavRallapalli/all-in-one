# Security & data-flow matrix

**Purpose:** Single table for security reviews — *what leaves the browser* and *what persists locally*.  
**Companion:** `docs/DEVBENCH-THREAT-MODEL.md` (threats and mitigations).  
**Maintenance:** Update when adding tools with `fetch`, WebSocket, `localStorage`, or new `app/api` routes.

Legend: **Net** = network from user’s browser (or server via our API). **Store** = browser persistence.

| Category / surface | Examples | Net to third party? | Net to DevBench origin? | Store (typical) |
|--------------------|----------|----------------------|-------------------------|-----------------|
| **Default tool** | Most `/tools/*` (formatters, encoders, PDF client, etc.) | No | Same-origin page assets only | Usually none; tool-specific |
| **Workspace pages** | `/json`, `/yaml`, `/graph-calculator`, `/image`, `/notepad`, … | No (client compute) | Same-origin | JSON presets: `devbench:json-workspace-presets`; Notepad: `devbench:notepad-session`, `devbench:notepad-recent`, `devbench:notepad-named-sessions`, `devbench:notepad-macro`; theme: `theme` |
| **API tester** | `/api-tester` | Yes — **target URL** (user-chosen) | **Yes** — `POST /api/proxy` forwards request from **our server** | None required |
| **Currency converter** | `/tools/...` (Frankfurter) | Yes — `api.frankfurter.app` | No | None |
| **WebSocket tester** | PDF hub / tools | Yes — **user-entered** WS/WSS URL | No | Optional URL in `localStorage` (see tool `STORAGE_KEY`) |
| **Background remover** | `@imgly/background-removal` | Yes — model CDN (see package / CSP) | No | None |
| **Mermaid editor** | `/tools/mermaid-editor` | Yes — Mermaid.js CDN (first load) | No | None |
| **DNS / IP / npm tools** | `dns-lookup`, `ip-info`, `npm-compare` | Yes — Cloudflare DoH, ipapi.co, registry.npmjs.org | No | None |
| **Site shell** | Header, analytics | Yes — GTM, Vercel scripts (CSP allowlist) | Same-origin | `theme`; tool search `devbench:recent` / `devbench:favourites` |

## Server routes (inventory)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/proxy` | POST | Forward HTTP(S) for API tester; SSRF + DNS resolve + production Origin (threat model §4.1) |
| `/api/convert-notebook` | POST | `.ipynb` → PDF via Chromium; Origin + rate limit; no jupyter on serverless (§4.2) |
| `/api/playground/go` | POST | Proxy Go compile to `go.dev`; Origin + rate limit + timeout (§4.3) |

*Add rows here for every new `src/app/api/**` route.*

## Notes for reviewers

1. **Secrets:** Users can paste tokens into JWT, API tester, etc. We must **never log** raw bodies in application logs or analytics payloads.
2. **Proxy:** Traffic to arbitrary URLs originates from **Vercel infrastructure**, not the user’s laptop — disclose in privacy policy / enterprise FAQ.
3. **CSP:** Third-party domains are allowlisted in `next.config.ts`; tightening CSP is a coordinated change with analytics.
