-- ``insert_source_if_not_exists`` — atomic upsert that distinguishes "I
-- inserted a new row" from "a row already existed" without relying on
-- exception handling. Used by the discovery loop to know whether a
-- discovered board_token actually became a new ``sources`` row.
--
-- Why this exists: the previous code in source_discovery.py did
-- ``try: insert; except Exception: return False``, which treats *every*
-- error as a duplicate — including transient connection issues, RLS
-- misconfigurations, and NOT NULL violations. A real write failure looked
-- identical to a successful dedup, so we silently dropped inserts when
-- something else went wrong. ON CONFLICT inside the database gives us a
-- deterministic boolean back without the exception channel.
--
-- The function is SECURITY DEFINER + SET search_path = '' (Supabase linter
-- rule) so it executes with table-owner privileges regardless of the caller's
-- RLS, and so search_path injection can't redirect the INSERT to a malicious
-- ``sources`` table in another schema.

CREATE OR REPLACE FUNCTION public.insert_source_if_not_exists(
  p_provider text,
  p_board_token text,
  p_company_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted boolean;
BEGIN
  INSERT INTO public.sources (provider, board_token, company_name, enabled)
  VALUES (p_provider, p_board_token, p_company_name, TRUE)
  ON CONFLICT (board_token) DO NOTHING;
  -- ``FOUND`` reflects whether the most recent INSERT/UPDATE/DELETE
  -- affected any rows. ON CONFLICT DO NOTHING sets it to FALSE when the
  -- conflict triggered the no-op branch.
  v_inserted := FOUND;
  RETURN v_inserted;
END;
$$;

-- Service role + authenticated callers both execute this; anon doesn't need
-- it (anon can't trigger discovery anyway).
GRANT EXECUTE ON FUNCTION public.insert_source_if_not_exists(text, text, text)
  TO service_role, authenticated;
