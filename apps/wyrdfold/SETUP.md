# Self-hosting WyrdFold

WyrdFold is a single-tenant AI job-search workspace: paste a few job descriptions, let it derive what you're looking for, and watch matching postings stream into a scored backlog. This guide walks through standing up your own instance from a fresh machine.

> **Status:** alpha. The hosted product at https://wyrdfold.com is the canonical reference deployment. This doc tracks the [#838 extraction](https://github.com/danieljoffe/danieljoffe.com/issues/838) — once WyrdFold lives in its own repo, this file moves with it.

---

## What you're standing up

Three components, each independently runnable:

| Service             | Where it runs                                                                                  | What it does                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/wyrdfold`     | Next.js 16 (App Router). Local: `pnpm nx dev wyrdfold` on port 3100. Production: Vercel.       | Web app — onboarding wizard, jobs list, target editor, resume tailor, insights dashboard. Acts as a BFF that proxies API calls to `wyrdfold-api`. |
| `apps/wyrdfold-api` | FastAPI on Python 3.11. Local: `pnpm nx serve wyrdfold-api` on port 8001. Production: Railway. | Core backend — Supabase persistence, LLM calls (Anthropic / OpenRouter), Brave Search source discovery, Greenhouse/Lever/Ashby polling.           |
| Supabase            | A Supabase project (cloud or self-hosted).                                                     | Postgres + Auth + Storage. WyrdFold's data layer.                                                                                                 |

External integrations are **all optional**. The app degrades gracefully when a key is missing (e.g. the SMS pipeline disables itself, Brave Search source discovery returns "discovery off", Sentry stops shipping telemetry). The only hard requirements are Supabase + an LLM provider key (or `LLM_PROVIDER=mock` for offline dev).

---

## Prerequisites

| Tool                    | Version               | Install                                                                                                  |
| ----------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| Node.js                 | `>=22` (see `.nvmrc`) | [nodejs.org](https://nodejs.org) or `mise use node@22`                                                   |
| pnpm                    | `>=10.12`             | `npm install -g pnpm`                                                                                    |
| Python                  | `3.11+`               | [python.org](https://python.org) or `mise use python@3.11`                                               |
| uv                      | latest                | `curl -LsSf https://astral.sh/uv/install.sh \| sh`                                                       |
| pandoc                  | latest                | `brew install pandoc` (macOS) / `apt-get install pandoc` (Linux). Required for `.docx` resume rendering. |
| Supabase CLI (optional) | latest                | `brew install supabase/tap/supabase`. Only needed if running migrations against a self-hosted Supabase.  |

---

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com), create a new project. Free tier is plenty.
2. From the project dashboard, grab:
   - **Project URL** — e.g. `https://abcde12345.supabase.co`
   - **anon key** (Settings → API → "anon public") — safe to embed in the frontend
   - **service-role key** (Settings → API → "service_role secret") — **never** embed in the frontend; backend-only
   - **JWT audience** — defaults to `authenticated`; only change if you customized it
3. **Run the migrations.** From the repo root:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   The migrations live in `supabase/migrations/`. There are ~80 of them as of this writing; expect the first push to take a couple of minutes.
4. **Configure Auth → URL Configuration** in the Supabase dashboard:
   - **Site URL:** your production wyrdfold deployment (e.g. `https://wyrdfold.example.com`)
   - **Redirect URLs allowlist** — add every callback URL you'll legitimately use:
     ```
     http://localhost:3100/auth/callback
     http://localhost:3000/auth/callback   # only if you also run the portfolio
     https://wyrdfold.example.com/auth/callback
     ```
     Supabase silently rewrites unmatched `emailRedirectTo` values to the Site URL, which manifests as "magic link works on prod but not localhost." Avoid the trap by allowlisting your dev port now.
5. **Email Templates → Magic Link** — confirm the template body uses `{{ .ConfirmationURL }}` (respects `emailRedirectTo`) rather than hardcoding `{{ .SiteURL }}/auth/callback`.

---

## 2. Configure environment variables

Two `.env` files, one per service.

### `apps/wyrdfold/.env.local`

```bash
# === Required ===
NEXT_PUBLIC_SUPABASE_URL=https://abcde12345.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_ID=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WYRDFOLD_API_URL=http://localhost:8001          # wyrdfold-api base URL
WYRDFOLD_API_KEY=local-dev-shared-secret        # cron / api-key endpoints

# === Optional ===
RESEND_API_KEY=                                  # Email notifications. Empty = disabled, UI hides toggle.
CRON_SECRET=                                     # Bearer-protect the /api/jobs/poll cron route. Empty = no auth required (fine for local).
NEXT_PUBLIC_SENTRY_CONFIG_ID=                    # Sentry browser instrumentation. Empty = no client telemetry.
```

### `apps/wyrdfold-api/.env`

```bash
# === Required ===
SUPABASE_URL=https://abcde12345.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role
WYRDFOLD_API_KEY=local-dev-shared-secret    # must match apps/wyrdfold/.env.local
ALLOWED_HOSTS=*                              # comma-separated; use '*' only in dev

# === LLM provider (pick one) ===
LLM_PROVIDER=anthropic                       # mock | anthropic | openrouter
ANTHROPIC_API_KEY=sk-ant-...                 # if LLM_PROVIDER=anthropic
# OPENROUTER_API_KEY=sk-or-...               # if LLM_PROVIDER=openrouter
# Set LLM_PROVIDER=mock for offline dev; no API key needed, fixtures replace real calls.

# === Optional ===
EMBEDDINGS_PROVIDER=mock                     # mock | voyage. Voyage is for relevance prefilter (currently unused on default config).
# VOYAGE_API_KEY=

FIRECRAWL_API_KEY=                           # JS-rendered page extraction fallback for /jobs/manual and target reference-JDs. Empty = no fallback.
BRAVE_SEARCH_API_KEY=                        # Empty = source discovery disabled. Free tier at https://brave.com/search/api/ is 2k queries/month.

TWILIO_ACCOUNT_SID=                          # SMS notifications. All three required to enable.
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

SENTRY_DSN=                                  # Server-side error tracking. Empty = disabled.
SENTRY_ENVIRONMENT=development

NEXT_APP_URL=http://localhost:3100           # for email/SMS callbacks pointed at the frontend
JOB_ALERT_SECRET=                            # HMAC for the FE → BE notification dispatch path

# === Feature flags (all default OFF) ===
PHASE1_TRIAGE_ENABLED=false                  # LLM-based title triage (default keyword cosine)
PHASE2_ENABLED=false                         # LLM-based four-axis scoring (requires PHASE1_TRIAGE_ENABLED)
RECENCY_DECAY_ENABLED=false                  # Decay job scores by posting age
LOGISTICS_EXTRACTION_ENABLED=false           # Pull salary/location/remote from JDs via LLM
URL_HEALTH_CHECK_ENABLED=false               # Periodic HEAD-check on live jobs (auto-archive 4xx)
POLL_SCHEDULER_ENABLED=false                 # In-process cron for periodic source polling
RATE_LIMIT_ENABLED=true                      # slowapi per-user rate limits (turn off in tests)
```

> **Default offline-safe config.** Setting only the four "Required" vars + `LLM_PROVIDER=mock` (no API keys) gives you a working dev environment where every external integration is faked.

---

## 3. Install dependencies

From the repo root:

```bash
pnpm install
uv sync
```

(In the standalone repo this becomes a single `pnpm install` — `uv` resolution will be wired into the dev script.)

---

## 4. Run it

Two terminals.

```bash
# Terminal 1 — Next.js dev server (port 3100)
pnpm nx dev wyrdfold

# Terminal 2 — FastAPI dev server (port 8001)
pnpm nx serve wyrdfold-api
```

Open [http://localhost:3100](http://localhost:3100). Sign in with your email (magic link). Walk through onboarding.

To run unit tests:

```bash
pnpm nx test wyrdfold              # Frontend
pnpm nx test wyrdfold-api          # Backend
```

To run end-to-end:

```bash
pnpm nx e2e wyrdfold-e2e
```

---

## 5. Optional integrations

| Integration          | What it unlocks                                                                                                                                                                                                                                     | Key                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Anthropic**        | First-party Claude access. Recommended over OpenRouter for lowest-latency.                                                                                                                                                                          | [console.anthropic.com](https://console.anthropic.com) |
| **OpenRouter**       | Drop-in Anthropic-compatible routing with provider fallback. Useful for cost-optimization or regional routing.                                                                                                                                      | [openrouter.ai](https://openrouter.ai)                 |
| **Firecrawl**        | JS-rendered job page extraction fallback (e.g. for Workday postings that hydrate client-side). Without it, manual job ingestion falls back to metadata-tag heuristics.                                                                              | [firecrawl.dev](https://firecrawl.dev)                 |
| **Brave Search API** | Discovery loop that finds ATS source candidates from search queries. Without it, sources must be added manually via `POST /sources`. Free tier: 2k queries/month, generous for daily-per-target with the default `DISCOVERY_QUERY_CAP_PER_RUN=200`. | [brave.com/search/api](https://brave.com/search/api/)  |
| **Resend**           | Job-alert emails. Frontend Route Handler dispatches via Resend; backend signs the payload with `JOB_ALERT_SECRET`.                                                                                                                                  | [resend.com](https://resend.com)                       |
| **Twilio**           | SMS job alerts. Needs all three: SID + Token + Phone Number.                                                                                                                                                                                        | [twilio.com](https://twilio.com)                       |
| **Sentry**           | Error tracking. Separate DSNs for frontend (`NEXT_PUBLIC_SENTRY_CONFIG_ID`) and backend (`SENTRY_DSN`).                                                                                                                                             | [sentry.io](https://sentry.io)                         |

---

## 6. Deploying

The reference deployment runs:

- **Frontend** on [Vercel](https://vercel.com) (auto from `develop` → preview, `main` → production)
- **Backend** on [Railway](https://railway.app) (Dockerfile at `apps/wyrdfold-api/Dockerfile`)

Both are vanilla deployments — no platform-specific code. Anywhere that runs Node 22 and Python 3.11 will work: Fly.io, Render, your own VPS, etc.

When deploying:

1. Mirror the `.env` files into the platform's environment variable UI.
2. Set the FE's `WYRDFOLD_API_URL` to the deployed BE's public URL.
3. Add your deployed FE's `https://your-domain/auth/callback` to the Supabase Redirect URLs allowlist.
4. Update Supabase Auth → URL Configuration → **Site URL** to your prod domain.

---

## Architecture

See [`.claude/docs/architecture.md`](../../.claude/docs/architecture.md) for the full monorepo map. The condensed version:

- **Frontend (`apps/wyrdfold/`)** — Next.js 16 App Router. Server components fetch from the backend via `src/lib/api/proxy.ts`. Client islands handle interactive state. Auth via `@supabase/ssr`.
- **Backend (`apps/wyrdfold-api/`)** — FastAPI with async handlers. JWT-validated against Supabase JWKS. Service-role Supabase client (RLS bypass; per-user scoping enforced in application code).
- **Shared UI (`libs/shared/ui/`)** — React component library. Tailwind CSS 4. Will publish to npm as `@danieljoffe/shared-ui` (tracked in #839).
- **Migrations (`supabase/migrations/`)** — flat directory of timestamped `.sql` files. Forward-only; never edited after merge.

---

## Troubleshooting

- **Magic link redirects to production URL when signing in on localhost.** Supabase silently rewrites unallowlisted `emailRedirectTo` values to the Site URL, **or** the magic-link email template hardcodes `{{ .SiteURL }}` instead of `{{ .ConfirmationURL }}`. Check both (Auth → URL Configuration AND Auth → Email Templates → Magic Link).
- **`pandoc not found on PATH`** during resume generation. Install pandoc (`brew install pandoc` / `apt-get install pandoc`). The backend will 500 with a `PandocNotInstalledError` until present.
- **`/jobs` empty after onboarding.** Source discovery is disabled without `BRAVE_SEARCH_API_KEY`. Add sources manually via `POST /sources` (see `apps/wyrdfold-api/scripts/seed_sources_from_career_ops.py`) or wire the Brave key.
- **`Error: Missing NEXT_PUBLIC_SUPABASE_URL`** at build time. Ensure `apps/wyrdfold/.env.local` exists and the var has no quotes around the value.
- **CORS errors on `/api/*`.** Set `CORS_ALLOWED_ORIGINS=http://localhost:3100` on the backend.

---

## Contributing

See the root `CLAUDE.md` for conventions (Rule of Three, component patterns, the shared-ui boundary). Issues and PRs welcome at the [parent monorepo](https://github.com/danieljoffe/danieljoffe.com) for now; will move to the standalone repo when #838 lands.

## License

The frontend and backend will inherit the standalone repo's license once the extraction lands. The shared-ui library is published under [FSL-1.1-MIT](../../libs/shared/ui/LICENSE.md).
