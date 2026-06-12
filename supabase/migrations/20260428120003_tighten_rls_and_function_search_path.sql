-- Address Supabase advisor security findings.
-- 1. Enable RLS on tables exposed to PostgREST. No policies are added —
--    the FastAPI backend uses the service role key, which bypasses RLS.
--    Without policies, the anon role is denied (the desired baseline).
ALTER TABLE public.job_target_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_analyses ENABLE ROW LEVEL SECURITY;

-- 2. Pin function search_path so functions resolve unqualified names against
--    a known schema list, preventing search_path-based hijacking.
ALTER FUNCTION public.match_target_by_label(text, double precision)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.sync_target_active()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.insights_trends(text, integer)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_user_profiles_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_target_jobs(uuid, integer, text, text, text, text, boolean, integer, integer)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.insights_score_stats(integer)
  SET search_path = public, pg_catalog;
