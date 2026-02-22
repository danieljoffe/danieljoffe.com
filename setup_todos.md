# Audit Tool — Setup TODOs

> Consolidated from phase_0_todos.md, phase_1_todos.md, phase_2_1.md, phase_2_2.md
>
> All Phase 0-2 **code** is implemented. What remains is infrastructure/manual setup and later-phase work.

---

## Your Setup (blocking — do these first)

### 1. Supabase

- [ ] **Link Supabase project** — Run `npx supabase link --project-ref <your-project-ref>` to connect the local CLI to the remote project
- [ ] **Push database migration** — Run `yarn db:push` to apply `supabase/migrations/20260213005724_create_audit_tables.sql` to the remote Supabase instance
- [ ] **Create `screenshots` storage bucket** — In Supabase Dashboard > Storage > New bucket, name it `screenshots`, set to **public**
- [ ] **Generate typed client (optional)** — Run `yarn db:gen-types` to generate `libs/shared/audit/src/lib/database.types.ts` for typed Supabase queries

### 2. Railway (Scan Service)

- [ ] **Deploy `apps/audit-scan-service`** to Railway (auto-detects the Dockerfile)
- [ ] **Set Railway env vars:**
  - `PORT=3001`
  - `SCAN_SERVICE_API_KEY=<shared-secret>`
  - `SUPABASE_URL=<your-supabase-url>`
  - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
  - `CHROME_PATH=/usr/bin/chromium`
  - `ALLOWED_ORIGIN=https://danieljoffe.com`
- [ ] **Note the deployed URL** — you'll use it as `SCAN_SERVICE_URL` below

### 3. Environment Variables (local + Vercel)

Set these in `apps/root/.env` (local) and in Vercel dashboard (production):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `SCAN_SERVICE_URL` (Railway URL from step 2)
- [ ] `SCAN_SERVICE_API_KEY` (must match Railway's value)
- [ ] `AUDIT_ADMIN_PASSWORD`
- [ ] `IP_HASH_SALT` (random string for IP anonymization)

### 4. Resend

- [ ] **Verify sending domain** in Resend dashboard (for `hello@danieljoffe.com`)

---

## Verification Checklist

Once the above is done, verify end-to-end:

- [ ] `GET <railway-url>/health` returns `{ status: 'ok' }`
- [ ] Supabase client can connect (test with a simple query)
- [ ] `npx nx build root` succeeds
- [ ] `npx nx dev root` — visit `http://localhost:3000/audit`, submit a URL, scan completes, report renders

---

## Deferred to Later Phases

### Phase 3 — Admin Dashboard

- [ ] Password-protected admin page at `/audit/admin`
- [ ] Stats row: total scans, scans today, total leads, conversion rate
- [ ] Recent scans table (sortable, paginated)
- [ ] Leads table (sortable, paginated)

### Phase 4 — Email Templates & Sequence

- [ ] React Email templates (replace inline HTML in lead capture endpoint)
  - `emails/full-report.tsx` — sent immediately on email capture
  - `emails/quick-win.tsx` — sent 3 days later
  - `emails/follow-up.tsx` — sent 10 days later
- [ ] Unsubscribe endpoint (`/api/email/unsubscribe`)
- [ ] Email sequence cron job (Vercel Cron, daily at 5pm UTC)
- [ ] Configure `vercel.json` crons

### Phase 5 — Polish & Launch

- [ ] QA with 10+ URLs (fast, slow, broken, redirects)
- [ ] Mobile testing (iPhone SE, iPhone 14, Pixel 5)
- [ ] OG tag verification (opengraph.xyz)
- [ ] Lighthouse the audit tool itself
- [ ] Analytics events (`audit_scan_started`, `audit_email_captured`, etc.)
- [ ] SEO: sitemap entry, structured data (FAQ schema)
- [ ] All Vercel env vars set (including `IP_HASH_SALT`)
- [ ] Vercel cron configured
- [ ] Error monitoring verified
