-- Pin search_path on the two insights functions to clear Supabase database
-- linter rule 0011 (function_search_path_mutable). The function definitions
-- in 20260420140000, 20260420150000, and 20260420180000 were updated inline
-- so a fresh `pnpm db:reset` produces clean functions; this ALTER catches
-- existing remote state where those migrations already ran.
--
-- search_path = public is sufficient: pg_catalog is implicitly first, and
-- both functions reference only `public.scans` plus pg_catalog primitives.

ALTER FUNCTION public.insights_score_stats(int) SET search_path = public;
ALTER FUNCTION public.insights_trends(text, int) SET search_path = public;
