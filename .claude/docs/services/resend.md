# Resend

## What it does in this app

Transactional email — every outbound email goes through Resend:

- **Job alerts** (#510) — fan-out from the poller via `POST /api/email/job-alert` (Next.js)
- **Contact form replies** — `apps/root/src/app/api/email/contact/`
- **Lead capture confirmations** — `apps/root/src/app/api/leads/capture/route.ts`
- **Marketing sequences** — `apps/root/src/app/api/email/sequence/route.ts`

The Next.js side renders React Email templates and calls Resend; the FastAPI side never talks to Resend directly.

- From address: `Daniel Joffe <noreply@danieljoffe.com>`
- Reply-to inbox: `hello@danieljoffe.com`
- Resend's message ID is stored in `job_notification_sent.external_id` for traceability

## Get an API key

1. Sign in at https://resend.com/login
2. **API Keys** → **Create API Key**
3. Name it `danieljoffe-prod` (or `-local`)
4. Permission: **Sending access** (full access if you also want to manage domains via API)
5. Copy the `re_…` value — only shown once

**Domain setup** (one-time, required to send from `noreply@danieljoffe.com`):

1. **Domains** → **Add Domain** → `danieljoffe.com`
2. Add the listed DNS records to your registrar (Cloudflare/Namecheap):
   - SPF (TXT)
   - DKIM (CNAME × 3)
   - DMARC (TXT)
3. Click **Verify** until all four go green — usually <10 min

Until the domain is verified, sending is rate-limited to a single test recipient (`onboarding@resend.dev`).

## Env vars

In `apps/root/.env.local`:

```env
RESEND_API_KEY=re_...
JOB_ALERT_SECRET=...   # shared secret with job-api → Next.js POSTs
NEXT_APP_URL=http://localhost:3000
```

In `apps/job-api/.env`:

```env
NEXT_APP_URL=http://localhost:3000
JOB_ALERT_SECRET=...   # must match the one above
```

`JOB_ALERT_SECRET` doesn't reach Resend — it's the bearer token for `/api/email/job-alert` so only the poller can trigger sends.

## Validate the key

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Daniel Joffe <noreply@danieljoffe.com>",
    "to": "hello@danieljoffe.com",
    "subject": "Resend smoke test",
    "text": "If you see this, the key + domain are wired."
  }'
```

A 200 with `{"id":"<uuid>"}` means it's working. 422 with a domain error = DNS not verified yet.

End-to-end via the app:

```bash
curl -X POST http://localhost:3000/api/email/job-alert \
  -H "Authorization: Bearer $JOB_ALERT_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"profileId":"...","to":"you@example.com","jobId":"...","title":"Test","company":"Acme","score":85,"jobUrl":"https://example.com"}'
```

## Cost / billing dashboard

- Usage: https://resend.com/dashboard
- Free tier: 3,000 emails/month, 100/day, single domain — fine for personal job-search volumes
- Paid plans start at $20/month for 50K emails

## Where it's wired

- Client init: `apps/root/src/lib/email/resend.ts:4` (`createResendClient`)
- Constants (FROM/TO): `apps/root/src/lib/email/resend.ts:10`
- Job alert handler: `apps/root/src/app/api/email/job-alert/route.ts`
- Contact form: `apps/root/src/app/api/email/contact/`
- Caller from FastAPI: `apps/job-api/app/services/notify.py:138` (`_post_alert`)

## Common errors

| Symptom                                    | Cause                                            | Fix                                                                            |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `401 invalid_api_key`                      | wrong key                                        | rotate, update `.env.local`, restart Next.js dev server                        |
| `422 domain not verified`                  | DNS records not propagated                       | confirm SPF/DKIM/DMARC in your registrar; click Verify                         |
| `403 testing_mode`                         | sending from unverified domain                   | finish domain verification, or send to `onboarding@resend.dev` for smoke tests |
| `429 rate_limit_exceeded`                  | free tier 100/day cap                            | upgrade plan, or batch sends                                                   |
| Job alert `Authorization` 401              | `JOB_ALERT_SECRET` mismatch between FastAPI/Next | confirm both `.env` files agree; restart both processes                        |
| Email queued in Resend but never delivered | recipient marked it spam previously              | check Resend dashboard → Logs; recipient may need to remove the suppression    |
