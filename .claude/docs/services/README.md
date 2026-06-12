# Service walkthroughs

How to set up an API key, configure env vars, and verify each external service
the portfolio + audit tool depend on. One file per service. Read whichever
you're debugging.

> WyrdFold's provider docs (Anthropic, Voyage, Firecrawl, Twilio, job boards)
> moved with the product to the `danieljoffe/wyrdfold` repo.

## Index

| Service              | Required for                       | Walkthrough                            |
| -------------------- | ---------------------------------- | -------------------------------------- |
| **Supabase**         | DB / service-role writes for audit | [supabase.md](supabase.md)             |
| **Resend**           | Transactional + contact-form email | [resend.md](resend.md)                 |
| **Sentry**           | Error tracking + APM               | [sentry.md](sentry.md)                 |
| **Lighthouse + axe** | Local-only audit tooling           | [lighthouse-axe.md](lighthouse-axe.md) |

## Convention

Each walkthrough follows the same structure:

1. **What it does in this app** — concrete, not generic
2. **Get an API key** — direct URL + plan/tier required
3. **Env vars** — names + which app(s) need them
4. **Validate the key** — one-shot command or curl
5. **Cost / billing dashboard** — direct link
6. **Where it's wired** — file:line for the client init
7. **Common errors + fixes**

## Where the env vars live

- **`apps/audit-api/.env`** — audit-only (Sentry DSN, Lighthouse/axe paths)
- **`apps/root/.env.local`** — Next.js (Supabase public + service role for SSR, Resend, Sentry frontend)

Never commit `.env*` files. The repo's `.gitignore` already covers them.
