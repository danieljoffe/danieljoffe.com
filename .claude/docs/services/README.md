# Service walkthroughs

How to set up an API key, configure env vars, and verify each external service the Fitted app depends on. One file per service. Read whichever you're debugging.

## Index

| Service                                                             | Required for                                       | Walkthrough                            |
| ------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| **Anthropic**                                                       | Resume tailoring, conversation, profile derivation | [anthropic.md](anthropic.md)           |
| **Voyage AI**                                                       | Job-experience embedding + semantic match          | [voyage.md](voyage.md)                 |
| **Supabase**                                                        | DB, auth, storage, RPC                             | [supabase.md](supabase.md)             |
| **Firecrawl**                                                       | JS-rendered job-page scraping fallback             | [firecrawl.md](firecrawl.md)           |
| **Twilio**                                                          | SMS job alerts                                     | [twilio.md](twilio.md)                 |
| **Resend**                                                          | Transactional email                                | [resend.md](resend.md)                 |
| **Sentry**                                                          | Error tracking + APM                               | [sentry.md](sentry.md)                 |
| **Job boards** (Greenhouse, Lever, Workday, Ashby, SmartRecruiters) | Job posting polling — no keys needed               | [job-boards.md](job-boards.md)         |
| **Lighthouse + axe**                                                | Local-only audit tooling                           | [lighthouse-axe.md](lighthouse-axe.md) |

## Convention

Each walkthrough follows the same structure:

1. **What it does in this app** — concrete, not generic
2. **Get an API key** — direct URL + plan/tier required
3. **Env vars** — names + which app(s) need them
4. **Validate the key** — one-shot command or curl
5. **Cost / billing dashboard** — direct link
6. **Where it's wired** — file:line for the client init
7. **Common errors + fixes**

## Two-mode services

`LLM_PROVIDER` and `EMBEDDINGS_PROVIDER` settings let wyrdfold-api run with either real or mock clients. **Mock is the default** so dev doesn't burn tokens accidentally. Flip to real in `.env` when you want end-to-end behavior:

```env
LLM_PROVIDER=anthropic
EMBEDDINGS_PROVIDER=voyage
```

If either is `mock`, you can leave the corresponding API key blank.

## Where the env vars live

- **`apps/wyrdfold-api/.env`** — backend secrets (Anthropic, Voyage, Supabase service role, Twilio, Firecrawl, job-alert secret)
- **`apps/audit-api/.env`** — audit-only (Sentry DSN, Lighthouse/axe paths)
- **`apps/root/.env.local`** — Next.js (Supabase public + service role for SSR, Resend, Sentry frontend, JOB_API_URL + JOB_API_KEY)

Never commit `.env*` files. The repo's `.gitignore` already covers them.
