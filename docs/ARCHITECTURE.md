# DevBench — architecture snapshot

**Purpose:** Onboard engineers and support security reviews. For threats, see `docs/DEVBENCH-THREAT-MODEL.md`.

## Stack

- **Framework:** Next.js App Router (see repo `package.json` for exact version).
- **Hosting:** Vercel (Fluid Compute / standard deployment — confirm in Vercel dashboard).
- **Styling:** Tailwind CSS v4 patterns (`globals.css`, design tokens).

## Routing model

| Kind | Example | Notes |
|------|---------|--------|
| **Workspaces** | `/json`, `/yaml`, `/pdf`, `/graph-calculator`, … | Multi-tool pages; often `page.tsx` client components with large UI. |
| **Single tools** | `/tools/[slug]` | Dynamic route per tool registry entry. |
| **API** | `POST /api/proxy`, `/api/convert-notebook`, `/api/playground/go` | Server-side; see threat model §4. |

**Workspace discovery:** `src/lib/devbench-workspaces.ts` — single list for command palette, slugs → workspace hrefs (`TOOL_SLUG_TO_WORKSPACE`), etc.

**Shareable state:**

- Engine tools may use `#state=` (see `shareable-tool-state` usage in repo).
- JSON workspace uses **`#jw=`** (`src/lib/json-workspace-share.ts`) — distinct payload format.

## Layout composition

- **`src/app/layout.tsx`** — Root HTML, fonts, GTM script tags, command palette, service worker registration, analytics. (`Header` is rendered per page/workspace, not in the root layout.)
- **Per-route layouts** — e.g. `graph-calculator/layout.tsx` adds SEO copy + `Footer` below the page.

## Client-only vs network

- **Default:** Tools run in the browser; no data sent to DevBench servers.
- **Exceptions:** API tester / JSON URL load / webhooks via `/api/proxy`; notebook PDF via `/api/convert-notebook`; Go playground via `/api/playground/go`. Any new `app/api/*` must be documented in the threat model.

## PWA / offline

- **`public/sw.js`** — Caches `/_next/static/*` only; avoids caching HTML/RSC.
- **`ServiceWorkerRegister`** — Registers in production only (`src/components/ServiceWorkerRegister.tsx`).

## Key directories

| Path | Role |
|------|------|
| `src/app/` | Routes, layouts, metadata |
| `src/components/` | Shared UI, tools, lazy palette |
| `src/lib/` | Registries, analytics helpers, workspace libs |
| `next.config.ts` | CSP, security headers, redirects |

## Layout / flex conventions (workspaces)

Full-height tool pages use **`flex flex-col`** with:

- **`shrink-0`** on fixed chrome (site header now includes `shrink-0` in `Header.tsx`).
- **`flex-1 min-h-0 overflow-hidden`** on scrollable main regions so flex children do not overlap headers or trap pointer events.

When adding a new workspace, copy this pattern from `json` or `graph-calculator` pages after layout review.

## Shared engineering boundaries (do not fork casually)

| Concern | Source of truth | Rule |
|---------|-----------------|------|
| Workspace routes for palette / deep links | `src/lib/devbench-workspaces.ts` | Add new multi-tool pages here first; wire `TOOL_SLUG_TO_WORKSPACE` when a slug moves under a workspace URL. |
| Tool list & categories | `src/lib/tools-registry.ts` | New `/tools/*` page must register here. |
| Analytics events | `src/lib/analytics-events.ts` (and callers) | New tools should emit success/error/copy consistently when meaningful. |
| CSP / redirects / HSTS | `next.config.ts`, `vercel.json` | One coordinated change; update threat model §6–§7. |
| Security narrative | `docs/DEVBENCH-THREAT-MODEL.md`, `docs/SECURITY-DATA-FLOW-MATRIX.md` | Any new `fetch`, WebSocket, or `app/api` route updates the matrix. |

## Related docs

- `docs/DOCUMENTATION.md` — index of engineering guides.
- `docs/PERFORMANCE-BUDGET.md` — lab/RUM targets.
- `docs/TECH-DEBT.md` — debt triage rules.
