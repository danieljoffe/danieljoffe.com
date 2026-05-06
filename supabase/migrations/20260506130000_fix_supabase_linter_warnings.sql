-- Clear remaining Supabase database linter warnings on the danieljoffe.com
-- project. The objects below (user_targets, bulk_update_*, get_target_jobs,
-- sync_target_active, match_target_by_label, pg_trgm) are not defined in this
-- repo's migrations — they belong to a separate codebase that pushes to the
-- same Supabase project. Each statement is wrapped in IF EXISTS guards so a
-- fresh `pnpm db:reset` here is a safe no-op; the migration only acts on the
-- remote project where the objects exist.
--
-- One warning is intentionally not addressed here:
--
--   auth_leaked_password_protection — toggled in the Supabase Auth dashboard
--   (Authentication → Policies → Password security). No SQL fix; enable
--   "Leaked password protection" there.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. function_search_path_mutable (lint 0011)
--
-- Pin search_path on the three flagged functions so they don't resolve names
-- against the caller's role-mutable search_path. Includes `extensions` so
-- references to pg_trgm operators continue to work after the schema move
-- below. Looked up via pg_proc/pg_namespace so we don't need to know the
-- exact argument signatures up front.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn_sig text;
BEGIN
  FOR fn_sig IN
    SELECT format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_target_jobs', 'sync_target_active', 'match_target_by_label')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', fn_sig);
  END LOOP;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. extension_in_public (lint 0014)
--
-- Move pg_trgm out of public into a dedicated `extensions` schema. Functions
-- that reference trigram operators/functions unqualified will resolve them
-- via the search_path set above (`public, extensions`). If a function or
-- index outside the three patched above relies on pg_trgm without an
-- explicit schema, add `extensions` to its search_path or qualify the
-- reference (e.g. `extensions.similarity(...)`).
-- ─────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. rls_policy_always_true (lint 0024)
--
-- The "Service role full access on user_targets" policy applied to PUBLIC
-- (every role) with USING (true) AND WITH CHECK (true), which effectively
-- disables RLS. Replace it with a service_role-only variant so the bypass
-- is intentional and scoped.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_targets'
      AND policyname = 'Service role full access on user_targets'
  ) THEN
    DROP POLICY "Service role full access on user_targets" ON public.user_targets;
    CREATE POLICY "Service role full access on user_targets"
      ON public.user_targets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. anon/authenticated_security_definer_function_executable (lints 0028, 0029)
--
-- bulk_update_salaries(jsonb) and bulk_update_scores(jsonb) are SECURITY
-- DEFINER and reachable via PostgREST as `/rest/v1/rpc/bulk_update_*`.
-- They're operator-only utilities; revoke EXECUTE from PUBLIC, anon, and
-- authenticated so only service_role can call them.
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'bulk_update_salaries'
      AND pg_get_function_identity_arguments(p.oid) = 'p_updates jsonb'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.bulk_update_salaries(jsonb) FROM PUBLIC, anon, authenticated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'bulk_update_scores'
      AND pg_get_function_identity_arguments(p.oid) = 'p_updates jsonb'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.bulk_update_scores(jsonb) FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;
