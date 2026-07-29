# DevBench — technical threat model

**Audience:** engineering, security review, enterprise IT.  
**Scope:** production site (`www.devbench.co.in`), Next.js App Router, Vercel hosting.  
**Last reviewed:** 2026-07-29 (update when CSP, proxy, or third-party embeds change).

---

## 1. System context (what we protect)

| Asset | Description | Primary exposure |
|--------|-------------|------------------|
| **User content** | JSON, YAML, PDFs, tokens, API bodies typed or pasted in tools | XSS if rendered unsafely; leakage via network/storage |
| **Browser storage** | `localStorage` (e.g. JSON workspace presets, favourites) | Physical/local attacker; XSS exfiltration |
| **Clipboard** | Copy/share links, tool outputs | Malicious page overlap; user mistake pasting secrets |
| **Session / identity** | Mostly anonymous; no first-party auth in core tools | Lower than SaaS with accounts; still protect origin integrity |
| **Origin reputation** | CSP, headers, proxy abuse | Open proxy SSRF; malware distribution via compromised deploy |
| **Vercel / deploy keys** | Build & runtime env | Credential theft; supply chain |

Most tools are **client-only**: computation stays in the browser. Exceptions are called out in §4.

---

## 2. Trust boundaries

```
[ User browser ]
   │  HTTPS
   ▼
[ www.devbench.co.in — Next.js + static ]
   │  POST /api/proxy              → user-chosen HTTP(S) targets (§4.1)
   │  POST /api/convert-notebook   → Chromium PDF (§4.2)
   │  POST /api/playground/go      → go.dev/_/compile (§4.3)
```

Third parties loaded in the browser (scripts, frames, beacons) are a **separate boundary**: see §6.

---

## 3. Adversary model (who / what we assume)

1. **Remote attacker** — drives victims to crafted URLs or tries reflected/stored XSS via any user-controlled string rendered as HTML.
2. **Malicious insider / power user** — abuses API tester proxy for port scanning, SSRF, or relaying traffic through our origin.
3. **Network attacker** — MITM on cleartext (mitigated by HSTS + HTTPS).
4. **Dependency / supply chain** — compromised npm package or CI secret.
5. **Enterprise proxy (e.g. Zscaler)** — not an adversary but a **control** that blocks or inspects traffic; affects availability, not integrity of our math.

---

## 4. Server-side attack surface

### 4.1 `POST /api/proxy` (`src/app/api/proxy/route.ts`)

**Purpose:** Allow the API tester to call arbitrary HTTP(S) URLs when browsers block mixed content or CORS.

**Controls (current):**

- Rejects **non-http(s)** schemes (`ftp:`, `file:`, etc.).
- Rejects **loopback** hostnames (`localhost`, `127.0.0.1`, `::1`, etc.).
- Rejects **RFC1918 / link-local / ULA-style** IPv4 patterns, IPv4-mapped IPv6 (`::ffff:…`), integer/short IPv4 forms, and common IPv6 local patterns (heuristic, not a full IP parser).
- **30s** timeout, **5 MB** response cap (oversize body replaced with message).
- **Manual redirect following** (max 5 hops) — each `Location` is re-parsed and re-checked with the same host/scheme rules before the next request.
- Strips hop-by-hop / dangerous request headers (`Host`, `Transfer-Encoding`, `Cookie`, …) before forwarding.
- Origin allowlist for browser requests; **null Origin rejected in production**.
- Per-IP rate limit (in-memory per instance).
- **DNS resolve** of each hop hostname — reject if any address is private/internal (rebinding defense).

**Residual risks:**

- **SSRF to “public” internal** — Split-horizon DNS where a hostname resolves to a *public* address from our edge but is sensitive elsewhere, or rare IP forms our heuristics miss. Mitigation depth: optional **allowlist mode** for enterprise builds; log hostname + status (PII-aware).
- **Abuse as open relay** — Production requires Origin; residual is same-origin browser abuse / stolen sessions. Mitigation: edge/KV rate limits, CAPTCHA or auth for heavy use, monitoring egress anomalies.
- **Response stored/logged** — Ensure no logging of full bodies in production analytics.

### 4.2 `POST /api/convert-notebook`

**Purpose:** Convert uploaded `.ipynb` notebooks to PDF (Chromium; optional jupyter nbconvert on non-serverless hosts).

**Controls (current):** Origin allowlist (null rejected in production), 5 req/min per IP, 50 MB upload cap, sanitized `Content-Disposition` filename, minimal notebook JSON shape check before Chromium, **jupyter spawn skipped on Vercel/serverless**.

### 4.3 `POST /api/playground/go`

**Purpose:** Proxy Go source to `https://go.dev/_/compile` for the multi-language playground.

**Controls (current):** Same Origin allowlist as proxy (null rejected in production), 20 req/min per IP, Zod body size cap (96 KB), 15s upstream timeout. Upstream is a fixed URL (not user-chosen).

### 4.4 Other server routes

Inventory should stay minimal. Any new `app/api/**` route must be listed here with purpose and auth model.

---

## 5. Client-side risks

### 5.1 XSS

- Prefer **React text nodes**; avoid `dangerouslySetInnerHTML` unless sanitized.
- **CSP** is defined in `next.config.ts` (allowlist for GTM, Vercel scripts, etc.). `unsafe-inline` / `unsafe-eval` are constrained by product needs (see comments in that file). Treat CSP tightening as a **tracked migration** (breaks GTM if done naively).

### 5.2 Sensitive data in URLs

- `#jw=` JSON workspace fragments can contain **PII or secrets** if users paste them. Mitigation: UX copy (“link may be long / sensitive”); consider **optional** gzip+base64 or serverless “paste bin” only if product explicitly wants it (new trust boundary).

### 5.3 Service worker (`public/sw.js`)

- Caches **`/_next/static/*`** only (no HTML/RSC). Reduces stale-shell risk. Residual: users on very old SW after deploy until refresh — acceptable tradeoff documented in code.

### 5.4 Third-party scripts (see §6)

---

## 6. Third parties & privacy (browser)

Loaded per `layout` / marketing needs (exact list may drift — verify in repo):

- **Google Tag Manager** / related Google domains (CSP `connect-src` / `script-src`).
- **Vercel Analytics / Speed Insights** (`va.vercel-scripts.com`, etc.).

**Implications:**

- **Subresource Integrity** is not uniformly applied to third-party scripts (they often change) — reliance is on **CSP allowlist** + vendor trust.
- **Enterprise blockers** may block analytics categories. Mitigation is product/commercial (lite “tools-only” page variant), not purely code.

---

## 7. Security headers (summary)

Implemented in `next.config.ts` (global `/(.*)`):

- **CSP** — primary application XSS mitigation; documented inline in source.
- **HSTS** — `max-age=63072000; includeSubDomains; preload` (see comments re apex → www and Vercel dashboard pairing).
- **X-Content-Type-Options: nosniff**, **X-Frame-Options: DENY**, **Referrer-Policy**, **Permissions-Policy** (camera/mic/geo off).

**Maintainers:** When changing CSP, run **smoke tests** on graph, JSON, PDF tools, and GTM/analytics in staging.

---

## 8. Residual risk register (executive)

| Risk | Severity | Mitigation direction |
|------|----------|----------------------|
| Open proxy abuse (`/api/proxy`) | High if unmonitored | Rate limits, abuse alerts, optional auth tier |
| XSS via unsanitized rich tool output | High | Code review + CSP + safe render helpers |
| Third-party script compromise | Medium | Minimize scripts, SRI where possible, subresource monitoring |
| User self-exfiltration (pasting secrets) | Medium (user) | Clear in-tool warnings; never log payloads |
| SW / cache confusion | Low | Keep narrow static-only policy |

---

## 9. Review cadence

- **Quarterly:** Re-read this doc, diff `next.config.ts` CSP, grep new `fetch`/`api/` routes, verify proxy limits still match product.
- **On incident:** Update §4 and §8 with timeline and corrective action.

---

## Cross-references

- `docs/DOCUMENTATION.md` — index of engineering guides.
- `docs/ARCHITECTURE.md` — routing, layout contracts, shared boundaries.
- `docs/SECURITY-DATA-FLOW-MATRIX.md` — tool × network × storage matrix.
- `docs/PERFORMANCE-BUDGET.md` — Web Vitals / Lighthouse targets.
- `docs/TECH-DEBT.md` — triage priorities.
- `docs/RUNBOOK.md` — build, deploy, E2E, rollback.
- `CONTRIBUTING.md` — onboarding and PR expectations.
