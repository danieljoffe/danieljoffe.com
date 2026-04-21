# job-api

FastAPI service that polls Greenhouse boards, scores postings, and serves results to the Next.js `/tools/jobs` dashboard.

## Local

```bash
uv run --package job-api uvicorn app.main:app --reload
pnpm nx test job-api
```

Copy `.env.example` → `.env` and fill in Supabase + secrets.

## Deploy to Railway

The service builds from the monorepo root so the uv workspace lockfile is in scope.

1. **Create the service**
   - New Project → Deploy from GitHub repo → select `danieljoffe.com`.
   - In service **Settings**:
     - **Root Directory**: leave empty (repo root) — required so the Dockerfile can see `pyproject.toml` and `uv.lock`.
     - **Config Path**: `apps/job-api/railway.toml`.
     - **Watch Paths**: `apps/job-api/**` (prevents rebuilds when only the Next.js app changes).
     - **Networking → Target Port**: `8080`. Must match the `--port 8080` in `railway.toml`. A mismatch returns `502 "Application failed to respond"` with `x-railway-fallback: true` even though the container is healthy.

2. **Set environment variables** (Settings → Variables) from `apps/job-api/.env.example`:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `JOB_API_KEY` — must match the value in Vercel's `JOB_API_KEY`
   - `ADMIN_SESSION_SECRET` — must match Vercel's `ADMIN_SESSION_SECRET`
   - `ALLOWED_HOSTS` — set to the Railway public domain (e.g. `job-api.up.railway.app`) once known
   - `GREENHOUSE_DELAY_MS`, `SCORE_NORMALIZER` — optional

3. **Generate the public domain** (Settings → Networking → Generate Domain). Copy the hostname.

4. **Wire Vercel**
   - Set `JOB_API_URL=https://<railway-domain>` and `JOB_API_KEY=<same value>` in Vercel project settings.
   - Update Railway `ALLOWED_HOSTS` to include the generated domain, then redeploy.

5. **Smoke-test**
   ```bash
   curl https://<railway-domain>/health
   # → {"status":"ok"}
   ```

## Notes

- The Dockerfile uses `ghcr.io/astral-sh/uv:latest` for deps, then `python:3.11-slim` at runtime.
- Railway supplies `$PORT` at runtime; the `startCommand` in `railway.toml` binds to it.
- Healthcheck path is `/health`; Railway marks the deploy live once it returns 200.
