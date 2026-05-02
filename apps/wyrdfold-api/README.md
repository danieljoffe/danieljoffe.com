# wyrdfold-api

FastAPI service that powers the standalone WyrdFold product. Forked from `apps/job-api` (Phase 3a of the WyrdFold migration — see `.claude/docs/wyrdfold-migration/PHASES.md` and `job-api.md`). The mechanical fork keeps the auth model, env-var names, and Supabase wiring identical to job-api; the auth refactor (real Supabase JWTs in place of the single-user API key), Sentry wiring, and per-user token-budget guards land in Phase 3b.

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

2. **Set environment variables** (Settings → Variables) from `apps/wyrdfold-api/.env.example`. Phase 3a inherits the job-api env-var names — env-var rename is part of the Phase 3b cutover.

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
- Phase 3a is **single-tenant** (hardcoded `tools-admin` user, same as job-api). Do not deploy publicly until Phase 3b lands the Supabase JWT auth and per-user enforcement.
