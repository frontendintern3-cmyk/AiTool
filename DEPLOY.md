# Deploying to your own domain (VPS + Docker)

This packages the app as three containers: `app` (Next.js), `db` (Postgres), and `caddy` (reverse proxy + automatic HTTPS for your domain). Tested for correctness locally (build, typecheck, and a full audit run against SQLite); the Docker build itself hasn't been run in this environment (no Docker available here) — build it on your VPS and report back anything that fails.

## 1. Prerequisites on the VPS

- A VPS running Linux (Ubuntu 22.04+ recommended) with Docker and the Docker Compose plugin installed:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo apt-get install -y docker-compose-plugin
  ```
- A domain (or subdomain, e.g. `audit.yourdomain.com`) with an **A record** pointing at the VPS's public IP. Caddy needs this to succeed before it can get a certificate.
- Ports 80 and 443 open/free on the VPS.

## 2. Get the code onto the VPS

Copy this whole project folder to the server (e.g. `git clone` if you push it to a repo, or `scp -r`), then `cd` into it.

## 3. Configure

```bash
cp .env.production.example .env
nano .env   # set DOMAIN, POSTGRES_PASSWORD, and optionally the API keys
```

- `DOMAIN` must match the DNS record you created.
- `POSTGRES_PASSWORD` — pick something random; it never leaves this server.
- `ANTHROPIC_API_KEY` — optional. Without it, the AI Analysis Layer (executive summary, cross-page consistency checks) is skipped; everything else works.
- `PAGESPEED_API_KEY` — optional, not currently used (Performance uses local Lighthouse instead).

## 4. Build and start

```bash
docker compose up -d --build
```

First run: builds the app image (installs deps, generates the Postgres Prisma client, builds Next.js — a few minutes), starts Postgres, runs `prisma migrate deploy` automatically (via `docker-entrypoint.sh`) before the app starts, then Caddy requests the TLS certificate for your domain.

Watch it come up:
```bash
docker compose logs -f
```

Once you see the Next.js server ready and Caddy has obtained a certificate, visit `https://your-domain`.

## 5. Everyday operations

```bash
docker compose ps                  # status
docker compose logs -f app         # app logs
docker compose down                # stop everything (data persists in volumes)
docker compose up -d --build       # rebuild after a code change
```

Data that persists across restarts/rebuilds (named Docker volumes):
- `db-data` — the Postgres database (all audits)
- `screenshots-data` — captured page screenshots (referenced by path from the database — don't delete this volume without also clearing the `Screenshot` table)
- `caddy-data` / `caddy-config` — the TLS certificate, so it isn't re-issued on every restart

## 6. Known limitations to be aware of

- **Single instance only.** Background audit jobs run in-process inside the one `app` container (no Redis/queue yet — see the code comments in `src/lib/queue`). Don't scale `app` to multiple replicas without swapping that for a real queue first, or jobs started on one replica won't be visible to another.
- **Lighthouse/screenshot runs are CPU-heavy.** A very small VPS (1 vCPU / 1GB RAM) may struggle if multiple audits run concurrently. 2 vCPU / 2GB+ RAM is a safer minimum.
- **No auth.** Anyone who can reach the domain can start audits and read every past audit's report. If that's not acceptable, put it behind Caddy `basicauth` or a VPN until real auth is built.

## 7. If something goes wrong

- `docker compose logs app` — most issues (migration failures, missing env vars, Chromium launch failures) show up here.
- If Chromium/Lighthouse fails inside the container: confirm `BROWSER_EXECUTABLE_PATH=/usr/bin/chromium` is set (it's baked into the image) and that `docker compose exec app /usr/bin/chromium --version` runs without error.
- If migrations fail on first boot: check `POSTGRES_PASSWORD` matches between what Postgres was initialized with and what's in `.env` — if you change the password after the `db-data` volume already exists, Postgres won't pick up the new one (its own data directory already has the old password baked in). Either keep it consistent or start over with `docker compose down -v` (this **deletes all data**).
