# Technical debt — triage framework

**Purpose:** Decide what to fix now vs later without thrashing.

## Priority order (default)

1. **Correctness & safety** — wrong math, crypto, parsing, XSS surface, proxy SSRF widening.
2. **Escape hatches** — user-visible errors with clear recovery (e.g. Fix JSON, reset view).
3. **Reliability** — broken navigation, hydration, E2E smoke failures.
4. **Performance** — regressions against `docs/PERFORMANCE-BUDGET.md`.
5. **Consistency** — duplicated routing (`/tools` vs workspace), copy/paste UI patterns.
6. **Cosmetic / DRY** — refactors that don’t change behavior.

## “Defer unless…” rules

| Debt type | Defer unless… |
|-----------|----------------|
| Broad refactor (rename packages, move all tools) | It unblocks (1) or (3) |
| New abstraction layer | Two call sites need it; third is imminent |
| Perfect CSP (remove `unsafe-inline`) | Legal/product sign-off on GTM/analytics replacement path |
| Migrate every tool to one layout component | New workspace ships and duplicates bugs |

## Known hotspots (edit as discovered)

- **Flex / full-height workspaces** — must use `shrink-0` on chrome + `flex-1 min-h-0 overflow-hidden` on main; see `docs/ARCHITECTURE.md`.
- **`/api/proxy`** — DNS resolve + production Origin now enforced; residual risk is split-horizon / public-looking internal hosts; prefer edge KV rate limits when traffic warrants.
- **Notebook PDF path** — Chromium remains heavy on serverless; jupyter spawn is skipped on Vercel (JS renderer only).
- **Notebook/markdown HTML** — regex sanitizers only; consider DOMPurify for richer notebook HTML if fidelity expands.

## Paydown cadence

- **Monthly:** burn 1–2 items from this list that touch priority (1)–(3).
- **Quarterly:** review with “delete completed / reprioritize” pass.
