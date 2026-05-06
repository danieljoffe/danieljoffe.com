-- Beta allowlist for the wyrdfold app. Populated by the invite script before
-- the admin invite call so the before-user-created auth hook lets the email
-- through. Combined with `shouldCreateUser: false` on the magic-link form, no
-- account can be created for an email that isn't in this table.
--
-- Service-role only: RLS is enabled with no anon/authenticated policies. The
-- hook function reads the table via the supabase_auth_admin grant.

CREATE TABLE public.wyrdfold_beta_invites (
  email text PRIMARY KEY,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

ALTER TABLE public.wyrdfold_beta_invites ENABLE ROW LEVEL SECURITY;

-- Auth hook called by GoTrue before every user-creation request. Receives the
-- event as jsonb (shape documented at
-- https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook).
-- Returns {} to allow, {error: {message, http_code}} to reject. Email is
-- lowercased on both sides so the comparison is case-insensitive.
CREATE OR REPLACE FUNCTION public.hook_restrict_wyrdfold_beta(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  user_email := lower(event->'user'->>'email');

  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email is required to sign up.',
        'http_code', 400
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wyrdfold_beta_invites
    WHERE lower(email) = user_email
  ) THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'This email is not on the wyrdfold beta list.',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT ALL ON TABLE public.wyrdfold_beta_invites TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.hook_restrict_wyrdfold_beta TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_wyrdfold_beta
  FROM authenticated, anon, public;
