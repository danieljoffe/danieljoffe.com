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
