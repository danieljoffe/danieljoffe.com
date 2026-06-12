-- Anonymize the beta-allowlist rejection so it's indistinguishable from
-- GoTrue's standard "user not found" path. Combined with
-- `shouldCreateUser: false` on the magic-link form, both paths now
-- produce identical responses — an attacker polling the OTP endpoint
-- with candidate emails can no longer enumerate the invite list.
--
-- The client-side `friendlyAuthError` in MagicLinkForm.tsx already maps
-- both error strings to the same UI copy, so the user-facing experience
-- is unchanged.
--
-- Surfaced by Phase 5 follow-up security review (M2).

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
    -- Match GoTrue's standard "user not found" error verbatim.
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'User not found',
        'http_code', 400
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;
