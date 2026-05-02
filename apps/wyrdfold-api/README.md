# wyrdfold-api

FastAPI service that powers the standalone WyrdFold product. Forked from `apps/job-api` in Phase 3a (see `.claude/docs/wyrdfold-migration/PHASES.md` and `job-api.md`). Phase 3b.1 wired Sentry and renamed the shared-secret env var to `WYRDFOLD_API_KEY`. Phase 3b.2 swapped the locally-minted admin session JWT for Supabase auth — user requests now present a Supabase Bearer token, while `WYRDFOLD_API_KEY` is reserved for cron / poller / batch callers. The remaining slices thread real `user_id` through services + cache keys (3b.3) and add per-user token-budget guards (3b.4).

## Local

```bash
uv run --package wyrdfold-api uvicorn app.main:app --reload --port 8001
pnpm nx test wyrdfold-api
```

Copy `.env.example` → `.env` and fill in Supabase + secrets. Default dev port is `8001` to coexist with job-api on `8000`.

## Deploy to Railway

The service builds from the monorepo root so the uv workspace lockfile is in scope.

1. **Create the service**
   - New Project → Deploy from GitHub repo → select `danieljoffe.com`.
   - In service **Settings**:
     - **Root Directory**: leave empty (repo root) — required so the Dockerfile can see `pyproject.toml` and `uv.lock`.
     - **Config Path**: `apps/wyrdfold-api/railway.toml`.
     - **Watch Paths**: `apps/wyrdfold-api/**` (prevents rebuilds when only the Next.js app changes).
     - **Networking → Target Port**: `8001`. Must match the port the container binds to. A mismatch returns `502 "Application failed to respond"` with `x-railway-fallback: true` even though the container is healthy.

2. **Set environment variables** (Settings → Variables) from `apps/wyrdfold-api/.env.example`. `SUPABASE_JWT_SECRET` (Supabase Project Settings → API → JWT Settings) verifies user Bearer tokens. `WYRDFOLD_API_KEY` is the cron-only shared secret (poller, batch). Set `SENTRY_DSN` (and optionally `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`) to enable error reporting.

3. **Generate the public domain** (Settings → Networking → Generate Domain). Copy the hostname.

4. **Wire Vercel** — set the WyrdFold app's API URL/key env vars to the Railway domain + matching key.

5. **Smoke-test**
   ```bash
   curl https://<railway-domain>/health
   # → {"status":"ok"}
   ```

## Notes

- The Dockerfile uses `ghcr.io/astral-sh/uv:latest` for deps, then `python:3.11-slim` at runtime.
- Railway supplies `$PORT` at runtime; the `startCommand` in `railway.toml` binds to it.
- Healthcheck path is `/health`; Railway marks the deploy live once it returns 200.
- Auth is in place (Supabase JWT for users, API key for cron) but the service layer is **still single-tenant** through Phase 3b.2 — every persistence call still resolves to `SINGLE_USER_ID = "tools-admin"`. Do not deploy publicly until Phase 3b.3 threads real `user_id` through services and cache keys.
