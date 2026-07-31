# Performance budget

**Purpose:** Keep “fast enough” objective for flagship routes under real conditions (analytics present).  
**Tooling:** Chrome Lighthouse (mobile + desktop), Web Vitals in production (`@vercel/speed-insights`), optional RUM.

## Routes to measure (minimum)

- `/` (home)
- `/json`
- `/pdf`
- `/graph-calculator`
- One heavy tool page under `/tools/[slug]` (rotate quarterly, e.g. large editor or PDF tool)

## Budgets (initial targets — adjust with real RUM)

Measured on **throttled 4G / mid-tier mobile** Lighthouse simulation unless noted.

| Metric | Target (mobile) | Notes |
|--------|-----------------|--------|
| **LCP** | ≤ 2.5 s | Hero / main content visible; keep analytics off the critical path. |
| **INP** | ≤ 200 ms | Interactions on JSON / graph must stay responsive. |
| **CLS** | ≤ 0.1 | Avoid layout shift on font/theme load; stable toolbars (`shrink-0`, `min-h-0`). |
| **TBT** (Lighthouse lab) | ≤ 300 ms | Third-party scripts dominate; track regressions, not absolutes. |

**Desktop** targets: LCP ≤ 1.8 s, INP ≤ 150 ms as stretch goals.

## Product-specific rules

1. **Service worker** (`public/sw.js`) — caches `/_next/static/*` only; do not expand to document/RSC without an invalidation design.
2. **Code splitting** — command palette loads on first ⌘K; custom vs generic `/tools/[slug]` clients are separate; Prettier/sql-formatter and Ajv load on use; heavy custom tools use `dynamic(..., { ssr: false })`.
3. **Images** — `loading="lazy"` / appropriate dimensions for marketing images.
4. **Static caching** — long-lived `Cache-Control` for `/pdfjs/*` and icons in `next.config.ts`; keep `sw.js` must-revalidate.

## Process

- Before major releases: run Lighthouse on the five routes above; attach PDF or scores to release notes if regressing.
- If **lab** and **RUM** disagree, trust RUM for INP/LCP on real devices.

## References

- `next.config.ts` — compression, source maps off in prod.
- `docs/RUNBOOK.md` — post-deploy smoke.
