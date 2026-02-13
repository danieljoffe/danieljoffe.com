# Phase 0 — Remaining TODOs

## Manual / Env File Tasks

- [x] Add `AUDIT_ADMIN_PASSWORD=your-admin-password` to `apps/root/.env.example` and `apps/root/.env`
- [ ] Run `npx supabase link --project-ref <your-project-ref>` to link the local Supabase CLI to the remote project
- [ ] Run `yarn db:push` to apply the migration to the remote Supabase database
- [ ] Create a `screenshots` storage bucket (set to **public**) in the Supabase dashboard (Storage > New bucket)
