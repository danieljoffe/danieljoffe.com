# Phase 1 — API Routes Implementation Plan

## Goal

Create the Next.js API endpoints that the audit tool frontend will call: scan trigger, scan status polling, report data retrieval, and lead capture with email delivery.

## Dependencies

- Phase 0 complete (Supabase tables, shared-audit lib, scan service, clients)
- Supabase migration applied to remote (`yarn db:push`)

---

## Design Decisions

### Route structure

All audit API routes live under `apps/root/src/app/api/audit/`. Lead capture lives under `apps/root/src/app/api/leads/`. This matches the execution plan and keeps audit concerns grouped.

### Imports

- **Supabase server client** — `createServerSupabaseClient` from `@/lib/supabase/server` (already exists, uses service_role key)
- **Shared types** — `Scan`, `ScanIssue`, `Lead` from `@danieljoffe.com/shared-audit`
- **Validation** — `normalizeUrl`, `isValidUrl`, `hashIp` from `@danieljoffe.com/shared-audit`
- **Resend** — `resend` from `@/lib/resend` (already exists)
- **Error tracking** — `captureApiError` from `@/lib/errorTracking` (existing pattern from `/api/email`)

### Next.js 16 dynamic route params

Per Next.js 16, dynamic route `params` is a `Promise` and must be awaited:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

### Security

- **Rate limiting** — Supabase-backed (count recent scans by `ip_hash`), not in-memory. In-memory maps are stateless across Vercel serverless invocations.
- **SSRF protection** — `isValidUrl` from shared-audit blocks localhost, private IPs, link-local, and requires TLD.
- **IP hashing** — SHA-256 with `IP_HASH_SALT` env var, truncated to 16 chars.
- **Email validation** — regex pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$` (matches execution plan).
- **Input sanitization** — Never trust client input; always validate `scan_id` as UUID format before DB queries.
- **Error responses** — Never leak stack traces or internal details. Return generic messages with appropriate HTTP status codes.
- **RLS** — API routes use service_role (bypasses RLS). Public-facing reads go through anon key on the client.

### Performance

- **Scan deduplication** — Before creating a new scan, check for a completed scan of the same normalized URL within the last hour. Return the cached result.
- **Fire-and-forget scan trigger** — The POST to the scan service is non-blocking. The endpoint returns `{ scan_id, status: 'pending' }` immediately.
- **Selective columns** — Status endpoint selects only `id, status, error_message, grade_overall`. Report endpoint strips `lighthouse_raw` and `axe_raw` from the response.
- **No `select('*')` on write paths** — Insert calls use `.select('id').single()` to return only what's needed.

---

## Steps

### Step 1 — Scan Trigger Endpoint

**File:** `apps/root/src/app/api/audit/scan/route.ts`

**Method:** `POST`

**Request body:**

```json
{ "url": "https://example.com", "source": "organic" }
```

**Logic:**

1. Parse and validate `url` from request body (400 if missing or invalid via `isValidUrl`)
2. Extract IP from `x-forwarded-for` header, hash with `hashIp`
3. Rate limit check: count scans in last hour by `ip_hash` (429 if >= 5)
4. Normalize URL with `normalizeUrl`
5. Deduplication: query for completed scan of same `normalized_url` within last hour → return `{ scan_id, status: 'completed', cached: true }` if found
6. Insert new scan row with `status: 'pending'`, return `scan_id`
7. Fire-and-forget `fetch` to scan service `/run-scan` with `x-api-key` header
8. On fetch failure, update scan to `failed` with error message (non-blocking)

**Responses:**
| Status | Body | When |
|--------|------|------|
| 200 | `{ scan_id, status: 'pending' }` | New scan created |
| 200 | `{ scan_id, status: 'completed', cached: true }` | Recent scan exists |
| 400 | `{ error: '...' }` | Missing or invalid URL |
| 429 | `{ error: '...' }` | Rate limit exceeded |
| 500 | `{ error: 'Internal server error' }` | Unexpected failure |

**Env vars used:** `SCAN_SERVICE_URL`, `SCAN_SERVICE_API_KEY`, `IP_HASH_SALT`

---

### Step 2 — Scan Status Endpoint

**File:** `apps/root/src/app/api/audit/status/[id]/route.ts`

**Method:** `GET`

**Logic:**

1. Await `params` to extract `id` (Next.js 16 Promise params)
2. Validate `id` is a valid UUID format (400 if not)
3. Query scan by `id`, selecting only `id, status, error_message, grade_overall`
4. Return 404 if not found

**Responses:**
| Status | Body | When |
|--------|------|------|
| 200 | `{ id, status, error_message, grade }` | Scan found |
| 400 | `{ error: 'Invalid scan ID' }` | Malformed UUID |
| 404 | `{ error: 'Scan not found' }` | No matching row |

---

### Step 3 — Report Data Endpoint

**File:** `apps/root/src/app/api/audit/report/[id]/route.ts`

**Method:** `GET`

**Logic:**

1. Await `params` to extract `id`
2. Validate `id` is a valid UUID format (400 if not)
3. Query scan by `id` where `status = 'completed'`
4. Query `scan_issues` by `scan_id`, ordered by `sort_order`
5. Strip `lighthouse_raw` and `axe_raw` from scan data (too large for client)
6. Return scan data + issues + summary counts (total, critical, warning, info)

**Responses:**
| Status | Body | When |
|--------|------|------|
| 200 | `{ scan, issues, summary }` | Completed scan found |
| 400 | `{ error: 'Invalid scan ID' }` | Malformed UUID |
| 404 | `{ error: 'Report not found' }` | Not found or not completed |

---

### Step 4 — Lead Capture Endpoint

**File:** `apps/root/src/app/api/leads/capture/route.ts`

**Method:** `POST`

**Request body:**

```json
{
  "email": "user@example.com",
  "name": "Jane",
  "company": "Acme",
  "scan_id": "uuid",
  "source": "full_report"
}
```

**Logic:**

1. Validate `email` with regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` (400 if invalid)
2. Validate `scan_id` as UUID if provided (400 if malformed)
3. Look up scan URL from `scans` table for `url_scanned` field
4. Check for existing lead with same `email` + `scan_id` → return `{ status: 'already_captured' }` if found
5. Insert lead row with `email_sequence_step: 1` and `last_email_at: now()`
6. Send report email via Resend (non-blocking try/catch — lead capture succeeds even if email fails)
7. Log email in `email_log` table

**Responses:**
| Status | Body | When |
|--------|------|------|
| 200 | `{ status: 'captured', lead_id }` | Lead saved |
| 200 | `{ status: 'already_captured', lead_id }` | Duplicate email+scan |
| 400 | `{ error: '...' }` | Invalid email or scan_id |
| 500 | `{ error: 'Internal server error' }` | Unexpected failure |

**Email:** Sends a plain HTML email via Resend with a link to the report page. A proper React Email template will replace this in Phase 3.

**Env vars used:** `RESEND_API_KEY`, `NEXT_PUBLIC_SITE_URL`

---

### Step 5 — UUID Validation Helper

**File:** `libs/shared/audit/src/lib/validation.ts` (append to existing)

Add a `isValidUuid` function to validate scan IDs before hitting the database:

```typescript
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
```

Export from `libs/shared/audit/src/index.ts` (already uses `export *`).

---

### Step 6 — CSP connect-src Update

**File:** `apps/root/src/proxy.ts`

The scan trigger endpoint calls `SCAN_SERVICE_URL` server-side (not from the browser), so no CSP change is needed. However, the frontend will poll `/api/audit/status/[id]` via `fetch` — these are same-origin requests and already covered by `'self'`.

No CSP changes required.

---

### Step 7 — Tests

**Files:**

- `apps/root/src/app/api/audit/scan/route.test.ts`
- `apps/root/src/app/api/audit/status/[id]/route.test.ts`
- `apps/root/src/app/api/audit/report/[id]/route.test.ts`
- `apps/root/src/app/api/leads/capture/route.test.ts`
- `libs/shared/audit/src/lib/validation.spec.ts` (add `isValidUuid` tests)

**Test approach:**

- Mock `@/lib/supabase/server` → return a mock Supabase client with chainable `.from().select().eq()` etc.
- Mock `@/lib/resend` → mock `resend.emails.send`
- Mock `fetch` for scan service trigger
- Test each endpoint's happy path and error cases:
  - Scan: valid URL, invalid URL, rate limited, cached result, scan service failure
  - Status: found, not found, invalid UUID
  - Report: completed scan, non-completed scan, invalid UUID
  - Lead: valid capture, duplicate, invalid email, email send failure (lead still captured)

---

## Files Changed

| Action | File                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Create | `apps/root/src/app/api/audit/scan/route.ts`                              |
| Create | `apps/root/src/app/api/audit/status/[id]/route.ts`                       |
| Create | `apps/root/src/app/api/audit/report/[id]/route.ts`                       |
| Create | `apps/root/src/app/api/leads/capture/route.ts`                           |
| Modify | `libs/shared/audit/src/lib/validation.ts` (add `isValidUuid`)            |
| Create | `apps/root/src/app/api/audit/scan/route.test.ts`                         |
| Create | `apps/root/src/app/api/audit/status/[id]/route.test.ts`                  |
| Create | `apps/root/src/app/api/audit/report/[id]/route.test.ts`                  |
| Create | `apps/root/src/app/api/leads/capture/route.test.ts`                      |
| Modify | `libs/shared/audit/src/lib/validation.spec.ts` (add `isValidUuid` tests) |

---

## Acceptance Criteria

- [x] `POST /api/audit/scan` creates a scan record and triggers the scan service
- [x] `POST /api/audit/scan` returns cached result if same URL was scanned within 1 hour
- [x] `POST /api/audit/scan` with invalid URL returns 400
- [x] `POST /api/audit/scan` respects rate limiting (5/hour/IP, persisted via Supabase)
- [x] `POST /api/audit/scan` with missing URL returns 400
- [x] `GET /api/audit/status/[id]` returns current scan status
- [x] `GET /api/audit/status/[id]` with invalid UUID returns 400
- [x] `GET /api/audit/status/[id]` with unknown ID returns 404
- [x] `GET /api/audit/report/[id]` returns scan data + issues for completed scans
- [x] `GET /api/audit/report/[id]` strips `lighthouse_raw` and `axe_raw` from response
- [x] `GET /api/audit/report/[id]` returns 404 for non-completed scans
- [x] `POST /api/leads/capture` stores the lead and sends an email
- [x] `POST /api/leads/capture` rejects malformed email addresses
- [x] `POST /api/leads/capture` returns `already_captured` for duplicate email+scan
- [x] `POST /api/leads/capture` succeeds even if email delivery fails
- [x] All endpoints return generic error messages (no stack traces leaked)
- [x] All scan_id params validated as UUID before DB queries
- [x] `npx nx test root` passes (existing + new tests)
- [x] `npx nx build root` succeeds

---

## Deviations from Execution Plan

| Area                 | Plan Says                    | Implementation Notes                                                                                         |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dynamic route params | `{ params: { id: string } }` | Next.js 16 requires `{ params: Promise<{ id: string }> }` + `await params`                                   |
| Server client import | `createServerClient`         | Actual function is `createServerSupabaseClient` (as implemented in Phase 0.3)                                |
| Validation imports   | `@/lib/audit/validation`     | Actual location is `@danieljoffe.com/shared-audit` (shared lib, not app-local)                               |
| UUID validation      | Not in plan                  | Added `isValidUuid` to prevent DB queries with malformed IDs                                                 |
| Error tracking       | Not in plan                  | Added `captureApiError` calls (matches existing `/api/email` pattern)                                        |
| Type safety          | `(i: any)` in report summary | Use `ScanIssue` type from shared-audit instead of `any`                                                      |
| Resend import        | `resend` from `@/lib/resend` | Imported `Resend` class directly from `'resend'` — `@/lib/resend` throws at module scope during `next build` |

---

## Remaining TODOs

### Code Fixes (before merging)

- [x] **Cache query uses `created_at` instead of `completed_at`** — Fixed: changed `.gte('created_at', ...)` to `.gte('completed_at', ...)` and `.order('created_at', ...)` to `.order('completed_at', ...)`.
- [x] **Use `.maybeSingle()` instead of `.single()` for cache check** — Fixed: `.maybeSingle()` returns `{ data: null, error: null }` for zero rows instead of a `PGRST116` error.

### Manual Setup (Phase 0 carry-over)

- [ ] **Link Supabase project** — Run `npx supabase link --project-ref <ref>` to connect the local CLI to the remote project
- [ ] **Push database migration** — Run `yarn db:push` to apply the `create_audit_tables` migration to the remote Supabase instance
- [ ] **Create screenshots storage bucket** — Create a public `screenshots` bucket in the Supabase dashboard for scan screenshot storage

### Deferred to Later Phases

- [ ] **React Email template** (Phase 3) — The lead capture email currently uses a plain HTML string. Replace with a proper React Email component for better maintainability and styling.
- [ ] **E2E tests for API endpoints** — No integration/E2E tests exist for the API routes. Consider adding Playwright API tests or a separate integration test suite that hits real endpoints.
