# Service walkthroughs

The only external-service walkthrough kept here is the audit tool's Lighthouse +
axe tooling. WyrdFold's provider docs — Anthropic, Voyage, Firecrawl, Twilio,
job boards, plus Supabase, Resend, and Sentry — moved with the product to the
`danieljoffe/wyrdfold` repo.

## Index

| Service              | Required for             | Walkthrough                            |
| -------------------- | ------------------------ | -------------------------------------- |
| **Lighthouse + axe** | Local-only audit tooling | [lighthouse-axe.md](lighthouse-axe.md) |

## Where the env vars live

The portfolio still _uses_ Supabase (SSR + audit service-role writes), Resend
(contact-form email), and Sentry (error tracking) — their walkthroughs just live
in the wyrdfold repo now:

- **`apps/audit-api/.env`** — Sentry DSN, Lighthouse/axe paths
- **`apps/root/.env.local`** — Supabase public + service role for SSR, Resend, Sentry frontend

Never commit `.env*` files. The repo's `.gitignore` already covers them.
