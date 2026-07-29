# DevBench — runbook

**Audience:** engineers on call, release manager.  
**Repo:** `all-in-one` (DevBench).

## Local development

```bash
npm install
npm run dev
```

- App: `http://localhost:3000` (default Next port).
- Read `AGENTS.md` / Next docs in `node_modules/next/dist/docs/` when changing App Router behavior (project convention).

## Build & quality gates

```bash
npm run build
```

- Fails on TypeScript errors and Next build errors.
- Run before merging significant UI or config changes.

Optional (if present in `package.json`):

```bash
npm run lint
npm test
```

## E2E smoke tests (Playwright)

**First-time setup** (install browsers once per machine):

```bash
npm install
npx playwright install chromium
```

**Run** (app must be reachable — pick one):

1. **Local:** terminal A `npm run dev`, terminal B:

   ```bash
   npm run test:e2e
   ```

2. **Preview / staging:** point Playwright at a deployed URL:

   ```bash
   PLAYWRIGHT_BASE_URL=https://your-preview.vercel.app npm run test:e2e
   ```

Tests live in `e2e/`; config in `playwright.config.ts`. Extend smoke coverage when adding flagship workspaces.

## Dependabot

`.github/dependabot.yml` opens weekly npm update PRs. Merge or supersede intentionally; run `npm run build` after dependency bumps.

## Environment variables

- Document **required** and **optional** vars in this section as they are introduced (Vercel dashboard + `.env.local` for local).
- Never commit secrets. Use Vercel env for production/preview.

## Deploy (Vercel)

1. **Branch → PR** — CI / preview deployment per team practice.
2. **Preview ≈ prod** — keep env vars aligned where possible so API tester / analytics behave like production.
3. **Production** — merge to default branch; Vercel promotes per project settings.
4. **Verify after deploy**
   - Open `/`, `/json`, `/graph-calculator`, `/pdf` — smoke navigation and one primary action each.
   - Confirm GTM/analytics load only if expected (ad blockers may hide them).

## Playground subdomain (`playground.devbench.co.in`)

The **same** Vercel project serves this host. Edge middleware (`src/middleware.ts`) rewrites `/` to the `/playground` route and **308-redirects** any other path to `https://www.devbench.co.in{path}` so tools and workspaces stay on `www`.

**Setup**

1. Vercel → your DevBench project → **Settings → Domains** → add `playground.devbench.co.in`.
2. At your DNS provider: **CNAME** `playground` → the target Vercel shows (often `cname.vercel-dns.com`).
3. After SSL is active, open `https://playground.devbench.co.in/` — it should match the in-app `/playground` workspace.

**When to use a separate Vercel project instead:** only if you need a different release cadence, env vars, analytics property, or compliance boundary. Otherwise one project + subdomain keeps shipping and CSP simpler.

## Rollback

1. Vercel dashboard → **Deployments** → select last known good → **Promote to Production**.
2. If bad change is config-only — revert commit and redeploy.

## CSP / security header change checklist

When editing `next.config.ts` CSP or headers:

1. Staging or preview URL: load homepage, tool with canvas, tool with clipboard, API tester (if applicable).
2. Browser console: no unexpected CSP violations for critical paths.
3. Update `docs/DEVBENCH-THREAT-MODEL.md` §6–§7 if allowlists change.

## Incident pointers

| Symptom | First checks |
|---------|----------------|
| **502/504 on `/api/proxy`** | Upstream timeout (30s); upstream down; body size. |
| **CSP blocks feature** | Console violation → adjust directive or remove inline script. |
| **Site blank after deploy** | SW cache (rare); hard refresh; verify `/_next/static` responses. |
| **Enterprise users blocked** | Category / TLS — product + IT; not fixed by app redeploy alone. |

## Useful paths

- Documentation index: `docs/DOCUMENTATION.md`
- CSP & headers: `next.config.ts`
- Edge HSTS duplicate: `vercel.json`
- API proxy: `src/app/api/proxy/route.ts`
- Threat model: `docs/DEVBENCH-THREAT-MODEL.md`
- Data-flow matrix: `docs/SECURITY-DATA-FLOW-MATRIX.md`
- Playground subdomain: `src/middleware.ts`, `src/lib/site-config.ts` (`PLAYGROUND_HOST`)
