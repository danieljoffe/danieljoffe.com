# audit-api

FastAPI service that runs Lighthouse + axe-core scans, grades results, and serves reports to the Next.js `/audit` pages. Replaces the Node.js `audit-scan-service` once parity is confirmed (see #183).

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

Not yet wired. Deployment instructions will mirror `apps/job-api/README.md` once Step 2 is done.
