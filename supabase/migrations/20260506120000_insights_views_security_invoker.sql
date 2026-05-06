-- Switch the insights views to security_invoker so they run with the querying
-- role's permissions instead of the view owner's. Supabase's database linter
-- flags owner-bound views (rule 0010_security_definer_view) because they
-- bypass RLS for the caller. Service-role queries already bypass RLS, so this
-- change is a no-op for the route handler but clears the linter error.

ALTER VIEW public.insights_summary_view SET (security_invoker = true);
ALTER VIEW public.insights_violations_view SET (security_invoker = true);
ALTER VIEW public.insights_domains_view SET (security_invoker = true);
