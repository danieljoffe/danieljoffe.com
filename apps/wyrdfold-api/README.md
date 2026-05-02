# wyrdfold-api

FastAPI service that powers the standalone WyrdFold product. Forked from `apps/job-api` in Phase 3a (see `.claude/docs/wyrdfold-migration/PHASES.md` and `job-api.md`). Phase 3b.1 renamed the API-key env var (`JOB_API_KEY` → `WYRDFOLD_API_KEY`) and wired Sentry. The remaining 3b slices replace the single-user `tools-admin` JWT path with Supabase auth, thread real `user_id` through services + cache keys, and add per-user token-budget guards.

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

2. **Set environment variables** (Settings → Variables) from `apps/wyrdfold-api/.env.example`. `WYRDFOLD_API_KEY` is the shared secret between the Next.js proxy and this API. Set `SENTRY_DSN` (and optionally `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`) to enable error reporting.

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
- Still **single-tenant** through Phase 3b.1 (hardcoded `tools-admin` user, same as job-api). Do not deploy publicly until Phase 3b.2/3b.3 land Supabase JWT auth and per-user enforcement.
