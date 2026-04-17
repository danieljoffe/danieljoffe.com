# audit-api

FastAPI service that runs Lighthouse + axe-core scans, grades results, and serves reports to the Next.js `/audit` pages. Replaced the retired Node.js scan service (see #183).

## Local

```bash
uv run --package audit-api uvicorn app.main:app --reload --port 8001
pnpm nx test audit-api
```

Copy `.env.example` → `.env` and fill in Supabase + secrets.

The Node service runs on `8080` and the Python service on `8001` so both can run in parallel during the parity window.

## Status

- **Phase 1 Step 1 (this scaffold):** health endpoint only. No scan logic yet.
- Step 2: port `POST /run-scan` (Lighthouse CLI + issue parsing + grading).
- Step 3: fail-open screenshot upload to Supabase Storage.
- Step 4: swap `SCAN_SERVICE_URL` to this service.
- Step 5: Docker + Railway deploy.

## Deploy to Railway

The service builds from the monorepo root so the uv workspace lockfile is in scope.

1. **Create the service**
   - New Project → Deploy from GitHub repo → select `danieljoffe.com`.
   - In service **Settings**:
     - **Root Directory**: leave empty (repo root).
     - **Watch Paths**: `apps/audit-api/**`.
   - The Dockerfile honors `$PORT` at runtime; no Config-as-code path needed.
2. **Set environment variables** (Settings → Variables):
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `AUDIT_API_KEY` — must match Vercel's `SCAN_SERVICE_API_KEY`
   - `ADMIN_SESSION_SECRET` — must match Vercel's
   - `ALLOWED_HOSTS` — set to the Railway public domain once known (use `*` temporarily during setup)
   - `SENTRY_DSN` — project DSN from Sentry. Leave empty to disable (scan failures then only surface in Railway logs).
   - `SENTRY_ENVIRONMENT` — `development` or `production`. Matches the Railway environment the service is deployed to.
   - `SENTRY_TRACES_SAMPLE_RATE` — float 0..1. Start at `0.1` in prod; tune down if trace volume gets expensive.
3. **Generate the public domain** (Settings → Networking → Generate Domain).
4. **Smoke-test**: `curl https://<domain>/health` → `{"status":"ok",...}`.
5. **Wire Vercel**: set `SCAN_SERVICE_URL=https://<domain>` after parity is confirmed (see below).

### Resource tier

Chromium needs headroom. Start at 1 GB RAM / 1 vCPU; bump to 2 GB if scans time out under real load.

### Promoting to production

The current Railway deployment is a `development` environment. To cut over to production:

1. **Add a `production` environment** (Railway → Project → `+ New Environment` → duplicate `development`).
2. **Scope the env vars per environment.** For each variable in step 2 above, use the environment dropdown so `production` gets its own `SUPABASE_*`, `AUDIT_API_KEY`, `ADMIN_SESSION_SECRET`, `ALLOWED_HOSTS`, and `SENTRY_ENVIRONMENT=production`. Share the Sentry DSN across environments; the `SENTRY_ENVIRONMENT` tag is how Sentry separates them.
3. **Generate a production domain** (Networking → Generate Domain under the `production` environment). Set `ALLOWED_HOSTS` to that host.
4. **Flip Vercel prod.** Set `SCAN_SERVICE_URL` in the Vercel production environment to the new domain. Trigger a redeploy of the Next.js app so the proxy picks it up.
5. **Rotate `AUDIT_API_KEY`** on the new environment before flipping, so the prior shared secret can't be reused.
6. **Watch Sentry + Railway logs for 24h** before retiring the `development` deployment.

## Parity test (before retiring the Node service)

`scripts/parity.py` fires both the Node and Python services at the same URLs and diffs the resulting Supabase rows. Run it once both services are live:

```bash
export PARITY_NODE_SERVICE_URL=https://<node-railway-domain>
export PARITY_NODE_SERVICE_API_KEY=<same value as node service env>
export PARITY_PYTHON_SERVICE_URL=https://<python-railway-domain>
export PARITY_PYTHON_SERVICE_API_KEY=<AUDIT_API_KEY>
export SUPABASE_URL=<supabase url>
export SUPABASE_SERVICE_ROLE_KEY=<service role key>

uv run --package audit-api python apps/audit-api/scripts/parity.py
```

Tolerance bands: performance ±10, a11y/seo/best-practices ±3, core web vitals ±30%, issue counts per category ±3. The script exits non-zero on any mismatch.
