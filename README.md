# Website Audit Platform

Evidence-first SEO / GEO / AEO / CRO website audit tool. Crawls a real site, runs real technical SEO / performance / accessibility / security / AI-visibility / CRO checks, scores them with a documented formula, and produces a single-page report per audit — plus PDF and branded PowerPoint export.

Every number in a report traces back to something actually measured (a crawl, a Lighthouse run, an axe-core scan, a response header) or an AI reading of the site's real text (quote-verified against the source page before it's ever shown). Nothing is fabricated; anything not yet measurable shows "Data unavailable" or an explicit "Phase 2/3" label instead of a guess.

## Local development

```bash
npm install
npx prisma migrate dev   # SQLite, zero extra setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Optional `.env` keys (all gracefully degrade if unset — see the module docstrings under `src/lib/audit/`):

```
ANTHROPIC_API_KEY=     # enables the AI Analysis Layer (exec summary, cross-page fact checks)
BROWSER_EXECUTABLE_PATH=  # override the auto-detected Chromium/Edge used for Lighthouse/axe-core/screenshots
```

## Deploying to your own domain

See [DEPLOY.md](DEPLOY.md) — Docker Compose (app + Postgres + Caddy for automatic HTTPS), meant for a VPS you control. This app needs a persistent Node process, a headless Chromium, and local disk (screenshots) — it is **not** deployable to Vercel/Netlify-style serverless hosting as-is.

## Architecture

- Each audit category is a module under `src/lib/audit/<category>/`, returning `{ result, recommendations }`. The engine (`src/lib/audit/engine.ts`) runs them in sequence, merges issues, and scores each category with a documented weighted formula (`src/lib/audit/scoring/index.ts`) — never an arbitrary number.
- `prisma/schema.prisma` (SQLite) is for local dev; `prisma-postgres/schema.prisma` is the production schema used by the Docker build. Keep model blocks in sync between the two — see the comment at the top of each.
- The report UI lives at `src/app/audit/[id]/(dashboard)/page.tsx` — one long scrolling document per audit, not a multi-page dashboard.
