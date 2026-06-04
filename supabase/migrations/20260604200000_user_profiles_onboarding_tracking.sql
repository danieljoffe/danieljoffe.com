-- Onboarding completion + step tracking on user_profiles.
--
-- See plan-wyrdfold-onboarding-completion-tracking.md.
--
-- Replaces the implicit "hasProse" gate (PR #829) with an explicit
-- timestamp. Adds onboarding_path + onboarding_current_step so a future
-- PR can let the OnboardingWizard resume from where the user left off.
--
-- Backfill: every existing user_profile whose user has authored prose
-- (experience_prose rows with non-empty content) is treated as having
-- completed onboarding at their last profile update. WyrdFold has 3
-- active users at migration time, so the impact scope is contained.

alter table public.user_profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_path text
    check (onboarding_path is null or onboarding_path in ('A', 'B', 'C')),
  add column if not exists onboarding_current_step text;

comment on column public.user_profiles.onboarding_completed_at is
  'Set by the OnboardingWizard when the user finishes the wizard. NULL = '
  'user has not completed onboarding; the FE dashboard redirects them to '
  '/onboarding. Belt-and-suspenders: the dashboard also keeps a hasProse '
  'fallback check so a user with this set but no profile data still gets '
  'redirected (with a Sentry warning).';

comment on column public.user_profiles.onboarding_path is
  'Which of the three onboarding paths the user picked: A (full setup), '
  'B (upload resume + pick targets), or C (conversation + pick targets). '
  'NULL until the user makes a choice on the PathChooser step.';

comment on column public.user_profiles.onboarding_current_step is
  'Wizard step the user was last on (e.g. ''identity'', ''upload-resume'', '
  '''pick-targets''). Updated on every wizard transition; the wizard reads '
  'it on mount to resume mid-flow. NULL = user has not started onboarding.';

-- Backfill: users with prose are considered onboarded. The
-- experience_prose_docs table is versioned per user; the existence of
-- any non-empty row is enough signal.
update public.user_profiles up
set onboarding_completed_at = up.updated_at
where onboarding_completed_at is null
  and exists (
    select 1 from public.experience_prose_docs ep
    where ep.user_id = up.user_id
      and ep.content is not null
      and length(ep.content) > 0
  );
