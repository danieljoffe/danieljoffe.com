# Lighthouse + axe-core

## What it does in this app

Powers the `/audit` tool. Both run **locally inside the `audit-api` container** — there's no third-party cloud service, no API key, just CLI binaries and a headless Chrome.

- **Lighthouse** — Google's perf/SEO/best-practices/PWA scoring CLI. Runs via `lighthouse <url> --output=json` from a Node binary.
- **axe-core** — Deque's accessibility ruleset. Run via Playwright in Python: navigate to the page, inject `axe.min.js`, call `axe.run()`, get a JSON violations report.
- The two run in parallel per scan (`asyncio.gather`) — Lighthouse spawns its own Chrome via `chrome-launcher`; axe drives its own Playwright Chromium. Independent processes, no shared state.

Output gets graded (`grading.py`), persisted to Supabase (`persistence.py`), and surfaced through `/audit/[id]` in the Next.js app.

## "Get keys" — there are no keys

These are local CLI tools. The setup work is making sure both binaries are present and a headless Chrome is reachable.

### Local dev (macOS)

The audit-api Dockerfile installs everything via apt; locally you need:

```bash
# Lighthouse CLI (Node)
pnpm add -g lighthouse              # or: npm i -g lighthouse

# Playwright + Chromium
pnpm dlx playwright install chromium
```

Confirm:

```bash
lighthouse --version
which chromium || which google-chrome
```

### Docker / Railway

The `apps/audit-api/Dockerfile` already installs `lighthouse` (npm), `chromium`, and `playwright` Chromium dependencies. Nothing to wire — Railway env just needs `SUPABASE_*` and the keys listed in `apps/audit-api/README.md`.

## Env vars

In `apps/audit-api/.env`:

```env
LIGHTHOUSE_BIN=lighthouse           # override if not on $PATH (e.g., absolute path in Docker)
```

That's it for tooling. The other audit-api env vars (`SUPABASE_*`, `AUDIT_API_KEY`, `SENTRY_DSN`, etc.) are documented in `apps/audit-api/README.md` and `sentry.md` / `supabase.md`.

## Validate

```bash
# Lighthouse standalone
lighthouse https://example.com --output=json --quiet --chrome-flags="--headless --no-sandbox" > /tmp/lh.json
jq '.categories.performance.score' /tmp/lh.json

# Playwright + axe
uv run --package audit-api python - <<'PY'
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://example.com")
        await page.add_script_tag(url="https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js")
        violations = await page.evaluate("async () => (await axe.run()).violations")
        print(f"{len(violations)} violations")
        await browser.close()

asyncio.run(main())
PY
```

End-to-end via the service:

```bash
curl -X POST http://localhost:8001/run-scan \
  -H "Authorization: Bearer $AUDIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","device":"desktop"}'
```

Should return a `scan_id` and (after ~30-60s) a row in `scans` with grades + issue counts.

## Cost / billing dashboard

Free. The only costs are the Railway compute (Chromium needs ≥1 GB RAM, see audit-api README) and Supabase storage for screenshots.

Watch:

- Railway memory graph during a scan (Lighthouse + Playwright Chromium running together can spike ~700 MB)
- `scans` row count and `audit_screenshots` storage bucket size — neither has TTL today

## Where it's wired

- Scanner orchestration: `apps/audit-api/app/services/scanner.py`
- Lighthouse subprocess wrapper: `apps/audit-api/app/services/scanner.py:46` (`_run_lighthouse`) — note the `start_new_session=True` to kill the Chrome subtree on timeout
- Lighthouse CLI args + config per device: `apps/audit-api/app/services/lighthouse_config.py`
- Browser pool (Playwright): `apps/audit-api/app/services/browser_pool.py`
- Issue extraction + de-dup: `apps/audit-api/app/services/issues.py`, `issue_mappings.py`
- Grading: `apps/audit-api/app/services/grading.py`
- Persistence: `apps/audit-api/app/services/persistence.py`

## Common errors

| Symptom                                         | Cause                                                                             | Fix                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Lighthouse produced no output. stderr: …`      | Chrome failed to launch (sandbox, missing deps)                                   | locally add `--no-sandbox`; in Docker confirm libgtk/libnss installed                                         |
| `Unable to connect to Chrome` on second scan    | prior Chrome subprocess orphaned                                                  | already mitigated by `start_new_session=True` + `killpg` — if it recurs, check the timeout path in scanner.py |
| `Lighthouse timed out after Ns`                 | site too heavy for the configured `SCAN_TIMEOUT_SEC`                              | bump the timeout, or scan a lighter route                                                                     |
| axe finds 0 violations on a clearly-broken page | page didn't finish loading before `axe.run`                                       | check `_axe_run` for `wait_until` value; bump if SPA hydration is slow                                        |
| OOM kill on Railway                             | 512 MB plan can't hold Lighthouse + Chromium                                      | upgrade to ≥1 GB plan (audit-api/README.md → "Resource tier")                                                 |
| Different scores between local and Railway      | CPU/network throttling profile differs (Lighthouse normalizes, but not perfectly) | trust the prod numbers; locally use `--throttling-method=devtools` to match closer                            |
