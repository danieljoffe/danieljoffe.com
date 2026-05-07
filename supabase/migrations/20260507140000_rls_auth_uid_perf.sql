-- Wrap `auth.uid()` calls in `(SELECT auth.uid())` across every RLS
-- policy added in 20260507120000_add_rls_user_scoping_policies.sql.
--
-- Postgres treats `auth.uid()` as STABLE (not IMMUTABLE), so without
-- the wrap it gets re-evaluated per row during policy enforcement. With
-- a `(SELECT ...)` subquery the planner caches the value once per query.
-- Per Supabase RLS performance guidance the wrap is "100x+ faster on
-- large tables" — and even on small tables it's free. Same fix for
-- subqueries that reference `auth.uid()` from inside the WHERE clause.
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations
--
-- Forward-only — uses ALTER POLICY to swap the expressions in place.
-- The original migration's policy bodies stay readable; only the
-- runtime expressions change.

-- user_targets (TEXT user_id — keeps the ::text cast)
ALTER POLICY "Users access their own user_targets"
  ON user_targets
  USING ((SELECT auth.uid())::text = user_id)
  WITH CHECK ((SELECT auth.uid())::text = user_id);

-- user_profiles
ALTER POLICY "Users access their own profile"
  ON user_profiles
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- llm_costs (SELECT only — no WITH CHECK needed)
ALTER POLICY "Users read their own llm_costs"
  ON llm_costs
  USING ((SELECT auth.uid()) = user_id);

-- documents
ALTER POLICY "Users access their own documents"
  ON documents
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- analyses (SELECT only)
ALTER POLICY "Users read their own analyses"
  ON analyses
  USING ((SELECT auth.uid()) = user_id);

-- experience_* tables
ALTER POLICY "Users access their own experience_prose_docs"
  ON experience_prose_docs
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users access their own experience_optimized_docs"
  ON experience_optimized_docs
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users access their own experience_conversation_turns"
  ON experience_conversation_turns
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users access their own experience_preferences"
  ON experience_preferences
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- experience_chunks (subquery on parent doc)
ALTER POLICY "Users access experience_chunks for their own docs"
  ON experience_chunks
  USING (
    optimized_doc_id IN (
      SELECT id FROM experience_optimized_docs
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    optimized_doc_id IN (
      SELECT id FROM experience_optimized_docs
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- batch_runs (SELECT only)
ALTER POLICY "Users read their own batch_runs"
  ON batch_runs
  USING ((SELECT auth.uid()) = user_id);

-- uploaded_resumes
ALTER POLICY "Users access their own uploaded_resumes"
  ON uploaded_resumes
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- document_versions (subquery on parent document)
ALTER POLICY "Users access document_versions for their own documents"
  ON document_versions
  USING (
    resume_id IN (
      SELECT id FROM documents WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    resume_id IN (
      SELECT id FROM documents WHERE user_id = (SELECT auth.uid())
    )
  );
