-- Enable pg_stat_statements so we can identify slow / hot queries.
--
-- Surfaces aggregated query stats in `pg_stat_statements` view:
--   query, calls, total_exec_time, mean_exec_time, rows, shared_blks_hit, …
--
-- Reset stats: SELECT pg_stat_statements_reset();
-- Top 10 by mean time: SELECT query, calls, mean_exec_time, total_exec_time
--   FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
--
-- On Supabase, the extension is allowlisted; CREATE EXTENSION just registers it
-- in this schema. Negligible overhead; safe to leave on in production.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
