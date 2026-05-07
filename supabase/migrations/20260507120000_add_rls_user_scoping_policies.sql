-- Defense-in-depth RLS policies on user-scoped tables (Phase 5 Sec P2).
--
-- The FastAPI backend uses the service role and bypasses RLS, so all
-- existing access continues to work. These policies only constrain calls
-- made with the anon or authenticated role (e.g. if any future feature
-- calls Supabase directly from the Next.js app with a user JWT).
--
-- Pattern: each `user_id`-keyed table gets an explicit policy that ties
-- access to `auth.uid()` from the caller's JWT. Tables already have RLS
-- enabled in earlier migrations; we only add the missing policies here.
--
-- The existing `user_targets` policy uses `USING (true)` which is a real
-- defense-in-depth hole — it permits anon SELECTs of every user's
-- linked targets. Replace it with a JWT-scoped policy.

-- ---- user_targets: replace too-permissive policy ---------------------------
DROP POLICY IF EXISTS "Service role full access on user_targets" ON user_targets;

CREATE POLICY "Users access their own user_targets"
  ON user_targets
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ---- user_profiles --------------------------------------------------------
CREATE POLICY "Users access their own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- llm_costs (renamed from llm_cost_log) --------------------------------
CREATE POLICY "Users read their own llm_costs"
  ON llm_costs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- documents (renamed from tailored_resumes) ----------------------------
CREATE POLICY "Users access their own documents"
  ON documents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- analyses (renamed from job_analyses) ---------------------------------
-- Read-only — analyses are produced by the API, not created by users.
CREATE POLICY "Users read their own analyses"
  ON analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- experience_* tables --------------------------------------------------
CREATE POLICY "Users access their own experience_prose_docs"
  ON experience_prose_docs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users access their own experience_optimized_docs"
  ON experience_optimized_docs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users access their own experience_conversation_turns"
  ON experience_conversation_turns
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users access their own experience_preferences"
  ON experience_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- experience_chunks has no user_id column. FK is `optimized_doc_id →
-- experience_optimized_docs(id)`; user_id lives on the parent. Constrain
-- via sub-select on the parent — slower than a direct equality but
-- keeps multi-tenant safety.
CREATE POLICY "Users access experience_chunks for their own docs"
  ON experience_chunks
  FOR ALL
  TO authenticated
  USING (
    optimized_doc_id IN (
      SELECT id FROM experience_optimized_docs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    optimized_doc_id IN (
      SELECT id FROM experience_optimized_docs WHERE user_id = auth.uid()
    )
  );

-- ---- batch_runs (renamed from batch_jobs) ---------------------------------
CREATE POLICY "Users read their own batch_runs"
  ON batch_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---- uploaded_resumes (renamed from resume_uploads) -----------------------
CREATE POLICY "Users access their own uploaded_resumes"
  ON uploaded_resumes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- document_versions (renamed from tailored_resume_versions) ------------
-- No direct user_id; access via parent document. The FK column kept its
-- original name `resume_id` after the table rename — rename pass renamed
-- tables, not columns.
CREATE POLICY "Users access document_versions for their own documents"
  ON document_versions
  FOR ALL
  TO authenticated
  USING (
    resume_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    resume_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- Notes:
--   - jobs / targets / sources / status_log have no user_id column. They're
--     scoped through the FastAPI's user_targets join (#P0-Sec-1). Adding
--     RLS policies on those would require a more invasive access model
--     (role-based, or rewrite the access pattern in Next.js). Out of
--     scope for this defense-in-depth pass.
--   - notifications_sent inherits the same pattern as jobs (no user_id);
--     same reasoning.
