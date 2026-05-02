# Supabase

## What it does in this app

- **Postgres** — every persistent table: `job_postings`, `job_targets`, `job_target_scores`, `experience_prose_docs`, `experience_optimized_docs`, `resume_chunks`, `resume_chunk_embeddings`, `llm_cost_log`, `user_profiles`, `conversation_turns`, etc.
- **Auth** — magic-link login for the Fitted app (frontend only)
- **Storage** — uploaded resume PDF/DOCX bytes (`resume_uploads/{user}/{upload_id}.{ext}`)
- **RPC** — custom Postgres functions, e.g. `get_target_jobs(target_id, limit, offset, ...)`
- **Realtime / Edge functions** — not used currently

## Get keys

1. Sign in at https://supabase.com/dashboard
2. Select project (or create one for new envs)
3. Project Settings → API:
   - **URL** — `https://<project-ref>.supabase.co`
   - **anon public** — for the browser (RLS-bound)
   - **service_role** — server-only, bypasses RLS — **never expose to the client**
4. Settings → Database → **Connection string** if you want direct psql access

## Env vars

**Frontend** (`apps/root/.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...           # anon, safe in browser
SUPABASE_SERVICE_ROLE_KEY=eyJhb...               # server-only (SSR / route handlers)
```

**job-api** (`apps/job-api/.env`):

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...               # job-api always runs as service_role
```

**audit-api** uses the same envs if it writes to the DB (check `apps/audit-api/app/config.py`).

## Validate the keys

Browser side (in dev tools console):

```js
const { data, error } = await window.supabase
  .from('job_postings')
  .select('id')
  .limit(1);
console.log(data, error);
```

Server side from job-api:

```bash
uv run python -c 'from app.supabase_pool import init_supabase, get_supabase; init_supabase(); print(get_supabase().table("job_postings").select("id").limit(1).execute())'
```

Direct psql (uses connection string from Settings → Database):

```bash
psql "$DATABASE_URL" -c "select count(*) from job_postings;"
```

## Migrations

- All migrations live in `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`
- Push to remote: `pnpm db:push` (wraps `supabase db push`)
- Generate fresh types after schema changes: `pnpm supabase gen types typescript --project-id <ref> > apps/root/src/lib/supabase/types.gen.ts`
- See `~/.claude/.../memory/reference_supabase_migrations.md` if accessible — has the full naming/workflow gotchas

## Cost / billing dashboard

- Project → Reports → **Database / Storage / Auth** for usage
- Free tier limits: 500MB DB, 1GB storage, 50K MAUs — fine for dev
- Watch row counts on `llm_cost_log` and `job_status_log` — they grow fastest

## Where it's wired

- Backend client pool: `apps/job-api/app/supabase_pool.py`
- Backend dependency: `apps/job-api/app/dependencies.py::get_supabase`
- Frontend browser: `apps/root/src/lib/supabase/client.ts`
- Frontend SSR: `apps/root/src/lib/supabase/server.ts`
- Frontend auth helpers: `apps/root/src/lib/supabase/auth-server.ts`

## Common errors

| Symptom                                           | Cause                                       | Fix                                                                      |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `JWT expired` in dev                              | `supabase.auth.refreshSession()` not called | logout + magic-link again, or clear cookies                              |
| `Permission denied for table foo`                 | hitting via anon key, no RLS policy         | server side: switch to service_role; client side: write/audit RLS policy |
| `relation "foo" does not exist`                   | migration not pushed                        | `pnpm db:push`                                                           |
| `column "bar" does not exist` after schema change | types out of date                           | regenerate types; run `pnpm tsc --noEmit`                                |
| `too many connections`                            | Supabase pooler limit                       | use the pooled URL (port 6543) instead of direct (5432)                  |
| All queries return `[]`                           | wrong project ref or RLS bug                | check URL points where you think; test with service_role to isolate      |
