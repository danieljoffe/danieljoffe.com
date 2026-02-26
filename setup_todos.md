# Audit Tool — Setup TODOs

> All Phase 0-5 **code** is implemented. What remains is infrastructure/manual setup and QA.

---

## Your Setup (blocking — do these first)

### 1. Supabase

- [ ] **Link Supabase project** — Run `npx supabase link --project-ref <your-project-ref>` to connect the local CLI to the remote project
- [ ] **Push database migration** — Run `yarn db:push` to apply `supabase/migrations/20260213005724_create_audit_tables.sql` to the remote Supabase instance
- [ ] **Create `screenshots` storage bucket** — In Supabase Dashboard > Storage > New bucket, name it `screenshots`, set to **public**
- [ ] **Generate typed client (optional)** — Run `yarn db:gen-types` to regenerate `libs/shared/audit/src/lib/database.types.ts` for typed Supabase queries

### 2. Railway (Scan Service)

- [ ] **Deploy `apps/audit-scan-service`** to Railway (auto-detects the Dockerfile)
- [ ] **Set Railway env vars:**
  - `PORT=3001`
  - `SCAN_SERVICE_API_KEY=<shared-secret>` (must match the Next.js app's value)
  - `SUPABASE_URL=<your-supabase-url>` (same URL as `NEXT_PUBLIC_SUPABASE_URL`, but the scan service reads it without the `NEXT_PUBLIC_` prefix)
  - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
  - `CHROME_PATH=/usr/bin/chromium`
  - `ALLOWED_ORIGIN=https://danieljoffe.com`
- [ ] **Note the deployed URL** — you'll use it as `SCAN_SERVICE_URL` below

### 3. Environment Variables (local + Vercel)

Set these in `apps/root/.env` (local) and in Vercel dashboard (production):

**Supabase:**

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — project URL from Supabase Dashboard > Settings > API
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_ID` — anon/public key from the same page
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — service role key (secret — never expose client-side)

**Scan Service:**

- [ ] `SCAN_SERVICE_URL` — Railway deployed URL from step 2
- [ ] `SCAN_SERVICE_API_KEY` — shared secret (must match Railway's value)

**Email (Resend):**

- [ ] `RESEND_API_KEY` — from Resend dashboard (emails fail gracefully if missing)

**Admin Dashboard:**

- [ ] `AUDIT_ADMIN_PASSWORD` — password for `/audit/admin` access

**Security:**

- [ ] `IP_HASH_SALT` — random string for IP anonymization in rate limiting
- [ ] `UNSUBSCRIBE_SECRET` — HMAC secret for signing unsubscribe tokens (falls back to `IP_HASH_SALT` if unset, then to a hardcoded default — set this for production)

**Cron:**

- [ ] `CRON_SECRET` — Bearer token for the `/api/email/sequence` cron endpoint (Vercel sets this automatically when you add a cron in `vercel.json`, but you must also set it in local `.env` for testing)

**Optional (have defaults):**

- [ ] `NEXT_PUBLIC_SITE_URL` — base URL for email links (default: `https://danieljoffe.com`)

### 4. Resend

- [ ] **Verify sending domain** `danieljoffe.com` in Resend dashboard — emails are sent from `noreply@danieljoffe.com` (see `libs/shared/ui` is irrelevant — the from address is in `apps/root/src/lib/email/resend.ts`)

---

## Verification Checklist

Once the above is done, verify end-to-end:

- [ ] `GET <railway-url>/health` returns `{ status: 'ok' }`
- [ ] Supabase client can connect (test with a simple query)
- [ ] `npx nx build root` succeeds
- [ ] `npx nx dev root` — visit `http://localhost:3000/audit`, submit a URL, scan completes, report renders
- [ ] Unsubscribe link in emails resolves correctly and marks lead as unsubscribed
- [ ] Admin dashboard authenticates and shows data at `/audit/admin`

---

## Code Implementation Status

### Phase 0 — Project Setup & Infrastructure

- [x] Database migration SQL
- [x] Scan service (Dockerfile, Express, Lighthouse, axe-core)
- [x] Supabase client setup (server + browser)
- [x] Shared type definitions and validation

### Phase 1 — API Routes

- [x] `POST /api/audit/scan` — scan trigger with rate limiting and dedup
- [x] `GET /api/audit/status/[id]` — scan status polling
- [x] `GET /api/audit/report/[id]` — report data
- [x] `POST /api/leads/capture` — email capture with full report email

### Phase 2 — Frontend

- [x] Scan landing page (`/audit`) with URL input, progress animation
- [x] Report page (`/audit/r/[id]`) with scores, grades, Core Web Vitals
- [x] Email gate with blurred issues
- [x] CTA section with Calendly button

### Phase 3 — Admin Dashboard

- [x] Password-protected admin page at `/audit/admin`
- [x] Stats row: total scans, scans today, total leads, conversion rate
- [x] Recent scans table (sortable, paginated)
- [x] Leads table (sortable, paginated)

### Phase 4 — Email Templates & Sequence

- [x] React Email templates (FullReport, QuickWin, FollowUp, EmailLayout)
- [x] Unsubscribe endpoint with token verification
- [x] Email sequence cron job (Vercel Cron, daily at 5pm UTC)
- [x] `vercel.json` cron config

### Phase 5 — Polish & Launch

- [x] Analytics events (6/6: scan started/completed/failed, email captured, calendly clicked, report shared)
- [x] SEO: sitemap entry, meta description, FAQ structured data
- [x] OG tags + dynamic OG image generation for reports
- [x] Share button with clipboard API
- [x] Error boundaries with Sentry on all audit routes
- [x] Loading states on all audit routes
- [x] Mobile-responsive layout throughout
- [x] Rate limiting UI feedback (429 handling)

---

## Manual QA Checklist

- [ ] Test scan with 10+ different URLs (fast sites, slow sites, broken sites, redirect URLs)
- [ ] Test error states (invalid URL, scan service down, rate limited)
- [ ] Test email capture flow end-to-end
- [ ] Test report page on mobile (iPhone SE, iPhone 14, Pixel 5)
- [ ] Test report page on desktop (1280px, 1440px, 1920px)
- [ ] Test admin dashboard
- [ ] Verify OG tags render correctly (use https://www.opengraph.xyz/)
- [ ] Check Lighthouse score of the audit tool itself
- [ ] Verify rate limiting works
- [ ] Verify email deliverability (check spam folder)

---

## Post-Launch (V2 Backlog)

Out of scope for MVP but documented for future development:

- [ ] PDF report export
- [ ] Rescan feature (compare before/after)
- [ ] Industry benchmark database
- [ ] Cost of inaction calculator with revenue estimates
- [ ] Blog integration (auto-insights from scan data)
- [ ] Webhook on scan completion (for Zapier/Slack notifications)
- [ ] Public API for programmatic scanning
- [ ] White-label option for agencies
- [ ] Migrate rate limiting to Vercel KV / Upstash for better accuracy under load
- [ ] DNS resolution check (resolve hostname and verify non-private IP before scanning) to fully mitigate SSRF
- [ ] Scan queue (e.g., BullMQ or a Supabase-based FIFO queue) to replace the in-process concurrency guard
- [ ] Proper admin auth (Supabase Auth or NextAuth) to replace the shared password
- [ ] Desktop Lighthouse config option (current MVP only runs mobile)
- [ ] Webhook signature verification on the scan service callback (currently relies solely on the API key header)
