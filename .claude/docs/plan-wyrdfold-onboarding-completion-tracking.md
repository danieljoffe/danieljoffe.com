# Implementation Plan: Onboarding Completion + Step Tracking

**Author:** Claude (2026-06-04)
**Status:** Small migration + wizard plumbing. Half-day of work. Follow-up to PR #829 (the prose-gate quick fix).
**Trigger:** Piotr (beta tester) landed on /dashboard expecting to be guided into onboarding. The quick fix (PR #829) gates on `hasProse`; this plan adds an explicit, robust gate plus the missing "resume mid-flow" UX.

## Goal

Two outcomes:

1. **Reliable new-vs-returning gate.** A persistent flag on the user_profile rather than inferring onboarding status from the presence of one specific data field (prose). Decouples the gate from any individual onboarding step's shape.
2. **Resume mid-flow.** The current `OnboardingWizard` restarts from step 1 if a user refreshes their browser. Track the current step so users can be dropped off and pick up where they left.

Belt-and-suspenders: the flag is the primary signal, but a `hasProse` fallback check stays in place. A user with `onboarding_completed_at` set but no prose (data drift, bug, manual DB cleanup) still gets bounced to /onboarding rather than rendering a broken empty dashboard — with a Sentry warning so we notice the drift.

## Why now

- Only 3 active beta users (Daniel, Melissa, Piotr). Backfill is trivial.
- The lateral discovery plan (`plan-wyrdfold-lateral-discovery-v2.md`) imagines "Find lateral targets" as a post-onboarding mini-flow. Explicit step tracking makes that cleanly insertable later without breaking the model.
- The quick fix in PR #829 (`hasProse`-gate) ships the Piotr bug; this plan is the longer-term shape. Net surgery is small.

## Schema

```sql
-- 20260604200000_user_profiles_onboarding_tracking.sql

alter table public.user_profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_current_step text;

comment on column public.user_profiles.onboarding_completed_at is
  'Set by the OnboardingWizard when the user clicks "Continue to dashboard" '
  'on the final step. NULL = user has not finished onboarding; the FE '
  'dashboard route redirects to /onboarding. Belt-and-suspenders: the '
  'dashboard also keeps a hasProse fallback check so a user with this set '
  'but no profile data still gets redirected (logged to Sentry).';

comment on column public.user_profiles.onboarding_current_step is
  'The wizard step the user was last on (e.g. "path_chooser", "identity", '
  '"resume_upload", "target_suggestions"). Updated on every wizard '
  'transition. The wizard reads this on mount and resumes from that step. '
  'NULL until the user starts onboarding.';

-- Backfill: every existing user_profile with prose authored is considered
-- to have completed onboarding at their last update.
update public.user_profiles up
set onboarding_completed_at = up.updated_at
where onboarding_completed_at is null
  and exists (
    select 1 from public.experience_prose ep
    where ep.user_id = up.user_id
      and ep.content is not null
      and length(ep.content) > 0
  );
```

**Why one migration with the backfill inline:** The backfill is forward-only and idempotent (the `where onboarding_completed_at is null` clause re-runs harmlessly). With only 3 users in scope today, the cost is negligible. If we ever hit hundreds of users, a separate migration + script would be cleaner — but we're not there.

## API changes

`apps/wyrdfold-api/`:

- **Pydantic model**: extend `UserProfile` with `onboarding_completed_at: datetime | None` + `onboarding_current_step: str | None`.
- **CRUD helper**: `services/user_profile/crud.py`:
  - `mark_onboarding_step(supabase, *, user_id, step)` — sets `onboarding_current_step` (idempotent).
  - `mark_onboarding_completed(supabase, *, user_id)` — sets `onboarding_completed_at` to `now()` if currently NULL (idempotent; doesn't overwrite a prior completion).
- **Routes** (`routers/user_profile.py`):
  - `PATCH /user-profile/onboarding/step` body `{ step: str }` → updates current step. Wizard calls on every transition.
  - `POST /user-profile/onboarding/complete` → sets completion timestamp. Wizard calls on final step.
- The existing `GET /user-profile` already returns the row; the new columns flow through automatically once added to the Pydantic model.

Step values are a closed enum, validated server-side:
```python
OnboardingStep = Literal[
    "path_chooser",      # PathChooser.tsx
    "identity",          # IdentityStep.tsx
    "job_url_input",     # JobUrlInput.tsx (path: from-JD)
    "resume_upload",     # ResumeUploader.tsx (path: from-resume)
    "target_suggestions", # TargetSuggestions.tsx
    "completion",        # CompletionScreen.tsx
]
```

Open the enum is YAGNI — when we add steps, we add enum values. The closed set protects against typos in FE code.

## Frontend changes

`apps/wyrdfold/`:

### Dashboard gate (replaces PR #829's hasProse-only check)

```tsx
// /dashboard server component
const profile = await fetchJsonFromWyrdfoldAPI<UserProfile>('/user-profile');

if (profile?.onboarding_completed_at == null) {
  redirect('/onboarding');
}

// Belt-and-suspenders: if completed_at is set but prose is missing,
// something has drifted. Log + redirect anyway.
const proseRes = await fetchJsonFromWyrdfoldAPI<ProseResponse>('/experience/prose');
if (proseRes == null || !hasProse(proseRes)) {
  Sentry.captureMessage(
    'dashboard:onboarding_flag_set_but_no_prose',
    { extra: { user_id: profile.user_id } },
  );
  redirect('/onboarding');
}
```

### OnboardingWizard resume

`OnboardingWizard.tsx`:

- On mount: fetch `/user-profile`; if `onboarding_current_step` is set, initialize wizard state with that step.
- On every step transition: call `PATCH /user-profile/onboarding/step` (fire-and-forget; if it fails, don't block the user — just log to Sentry).
- On final-step "Continue to dashboard" button: call `POST /user-profile/onboarding/complete`, then route to `/dashboard`.

### Settings page — "Redo onboarding"

Optional, low-priority: a button in `/settings` that calls a new endpoint to clear `onboarding_completed_at` + `onboarding_current_step`. Useful for the rare case where a user wants to redo. Defer to a follow-up — not in this PR.

## Edge cases handled

| Scenario | Behaviour |
|---|---|
| Brand new user, never visited /onboarding | `onboarding_completed_at` NULL → dashboard redirects → wizard starts at step 1 |
| User starts wizard, refreshes mid-flow | Wizard reads `onboarding_current_step` on mount → resumes there |
| User finishes wizard | Final-step button sets `onboarding_completed_at` → next dashboard visit renders normally |
| Existing user (pre-migration) with prose | Backfill sets `onboarding_completed_at = updated_at` → dashboard renders normally |
| Flag set but prose missing (data drift / bug) | Belt-and-suspenders check kicks in → Sentry warning + redirect to /onboarding |
| User has flag set but their prose was DELETED via support action | Same as above — redirect to /onboarding, which is the right place to recover |
| User in wizard step N, we add a new step | Wizard validates the step value against the closed enum; unknown values fall through to step 1 (safe default with a Sentry warning) |

## Testing

- **Unit (backend)**:
  - `crud.mark_onboarding_step` writes the field; rejects unknown step values via enum validation.
  - `crud.mark_onboarding_completed` is idempotent — second call doesn't overwrite the timestamp.
- **Unit (frontend)**:
  - Dashboard server component redirects when flag is null.
  - Dashboard server component redirects with Sentry warning when flag is set but prose missing.
  - Dashboard renders happy path when both flag is set and prose exists.
  - OnboardingWizard resumes from saved step on mount.
- **E2E** (Playwright, future):
  - Invite a fresh test user → land on /dashboard → assert redirect to /onboarding.
  - Step through wizard halfway, refresh, assert resume.
  - Complete wizard, assert /dashboard renders.

## Sequencing

Single PR, fits in one review. Files touched:

- 1 new migration
- 1 Pydantic model edit
- 1 CRUD helper edit
- 1 router edit (2 new endpoints)
- 1 dashboard page edit (supersede PR #829's gate)
- 1 wizard component edit (resume + persist)
- 4-6 unit tests

If review wants it smaller, split into:
- PR 1: schema + API (backend-only, harmless when FE doesn't consume)
- PR 2: dashboard gate switch + wizard resume (FE-only, depends on PR 1)

## Open questions

1. **Belt-and-suspenders Sentry warning threshold**: log every drift event as a warning, or aggregate (1 event per user per day)? Lean toward every event — drift is rare, signal-to-noise will be fine.
2. **What's the "Redo onboarding" trigger?** Settings page button (low UI complexity) vs a separate "Reset my profile" support action (no UI). Defer the decision; ship without either initially.
3. **Should `onboarding_current_step` enforce monotonic progression?** I.e. once a user reaches `target_suggestions`, can they go back to `path_chooser`? Today's wizard doesn't have a back button, so this is moot — but if we add one, the field would need to support backward transitions. Don't constrain server-side for now.

## Out of scope

- Per-step completion timestamps (e.g. `identity_completed_at`). YAGNI — current_step + completed_at covers the gating use case; full step-by-step analytics is a separate workstream.
- Multi-tenant / org-level onboarding. WyrdFold is single-user per account.
- E2E test for the resume flow. Worth doing but can come later; unit tests cover the wiring.

## Connection to other plans

- **Replaces the hasProse gate from PR #829** as the primary signal. The fallback check survives.
- **`plan-wyrdfold-lateral-discovery-v2.md`**: explicit step tracking makes "Find lateral targets" cleanly insertable as a post-onboarding flow. Add a new `OnboardingStep` enum value when shipped.
- **No coupling to OpenRouter migration.** Independent workstream.
