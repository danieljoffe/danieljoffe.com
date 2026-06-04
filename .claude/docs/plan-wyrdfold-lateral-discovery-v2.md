# Implementation Plan: Lateral Discovery v2

**Author:** Claude (2026-06-03)
**Status:** Planning. PRs sized to be independently reviewable; sequencing in §10.
**Prereq:** Lateral discovery v1 (PR #808) and slim-target shape (PRs #803/#805) in production. Axis weights v1 (PR #807 / #809 / #810) shipped.

## Goal

Take lateral discovery from a one-shot prompt into a usable feature: the user can run it repeatedly without re-seeing junk, dismiss suggestions they don't like, save some for later, activate others without staring at a spinner. Cost grows sublinearly with usage.

In parallel: reconcile onboarding-time target suggestions (`suggest_targets`) with lateral-time target suggestions (`suggest_lateral_targets`) into a single reusable surface. The two prompts have diverged in ways that aren't justified by their different contexts.

## Why now

Lateral v1 ships discovery but stops short of letting the user _manage_ it:

- No way to say "stop showing me this one" — re-running the call re-suggests dismissed labels.
- No `target_suggestions` audit table; we can't tell what was offered or what got picked.
- Each pick fires a `derive_profile_from_label` call inline; UX-wise the user waits.
- The active-target cap silently fails when the user picks one too many.
- Two near-identical Sonnet prompts (onboarding `suggest_targets` vs lateral `suggest_lateral_targets`) drift in maintenance.

Without these, lateral discovery is a one-time toy. With them, it's a repeat-use surface that compounds over weeks.

## What we're building (six things, sequenced)

1. **`target_suggestions` table.** Persisted audit of every suggestion the LLM has ever offered each user, with state (`offered_at`, `dismissed_at`, `saved_at`, `activated_at`).
2. **`target_derivations` cache.** Cross-user cache of `derive_profile_from_label` output, keyed by `(label_lower, seniority_hint)`. The same canonical label produces the same slim shape regardless of which user picked it.
3. **Reconciled suggestion prompt.** One system prompt with a `mode` toggle: `onboarding` (no current targets, no exclusions), `lateral` (current targets exist, same-altitude focus), `explore` (current targets exist, intentionally unrelated verticals).
4. **Confidence floor API.** `?min_confidence=N` query param on the suggestion endpoints, with a server-side default that hides obviously stretch picks unless the user opts in.
5. **Background activation flow.** Activating a suggestion enqueues `derive_profile_from_label` + activation as a background job; the card flips to "Activating" → "Active" via polling or realtime. User never blocks.
6. **Cap-collision swap UX.** When activating would exceed the per-user active limit, return a structured error with the list of currently-active targets so the FE can render "deactivate which one?" in a single round-trip.

## Detailed shape

### 1. `target_suggestions` table

```sql
create table public.target_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- The suggested target itself. We persist the *suggestion*, not a
  -- reference to a target row, because most suggestions never get
  -- activated. The slim shape gets derived (lazily, via the cache in
  -- §2) only when the user picks one.
  label text not null,
  label_lower text generated always as (lower(label)) stored,
  seniority_hint text not null,         -- SeniorityHint enum, validated app-side
  one_line_reasoning text,
  lateral_relationship text,
  primary_industry text,
  confidence int not null check (confidence between 0 and 100),

  -- Where the suggestion came from. "onboarding" / "lateral" / "explore"
  -- — see §3. Useful for analytics and for re-running just the modes
  -- the user found useful.
  source text not null check (source in ('onboarding', 'lateral', 'explore')),

  -- Lifecycle. Three terminal states; at most one is non-null per row.
  offered_at timestamptz not null default now(),
  dismissed_at timestamptz,
  saved_at timestamptz,
  activated_at timestamptz,
  -- When activated_at is set, this points to the target row that was
  -- linked/created. Null until activation. Cascade null on target
  -- delete so we don't lose suggestion history when targets are pruned.
  activated_target_id uuid references public.targets(id) on delete set null,

  -- Dedup helpers: a user shouldn't get the same suggestion twice across
  -- runs. The `label_lower` + `user_id` pair is the dedup key; we use a
  -- partial unique index so re-offers after a dismiss/save are still
  -- possible if the user explicitly clears them.
  constraint target_suggestions_state_disjoint
    check (
      (case when dismissed_at is not null then 1 else 0 end)
      + (case when saved_at is not null then 1 else 0 end)
      + (case when activated_at is not null then 1 else 0 end)
      <= 1
    )
);

create index target_suggestions_user_offered_idx
  on public.target_suggestions (user_id, offered_at desc);

-- Dedup: prevent re-suggesting a label the user has already seen
-- (regardless of state). Re-offer requires explicit "show me again"
-- gesture from the user, which clears the row.
create unique index target_suggestions_user_label_unique
  on public.target_suggestions (user_id, label_lower);

alter table public.target_suggestions enable row level security;

create policy "Users read own suggestions"
  on public.target_suggestions for select
  using (user_id = auth.uid());

-- Inserts and state transitions go through the service role from the
-- API; users don't write directly.
```

**Why persist the suggestion shape and not just `(user_id, label, state)`?** The full row captures _why_ the LLM suggested it. Six weeks later, when a user asks "wait, why did you suggest VP of Member Experience?", we have the reasoning string verbatim — not a regenerated summary that's now drifted with prompt evolution.

**Why a unique index on `(user_id, label_lower)` rather than a state-aware partial unique?** Simpler invariant. If the user wants to see a dismissed suggestion again, the FE explicitly deletes the row (`DELETE /api/target-suggestions/{id}`) — which is rare enough to not need first-class API support in v1.

### 2. `target_derivations` cache

```sql
create table public.target_derivations (
  id uuid primary key default gen_random_uuid(),

  -- Cache key. (label, seniority) is the canonical pair: "Director of CX
  -- Operations" at seniority "director" produces a stable slim shape
  -- regardless of which user picked it.
  label_lower text not null,
  seniority_hint text not null,

  -- The cached slim-shape output. Stored as jsonb so the schema can
  -- evolve without a migration; the API parses through the existing
  -- SlimTargetDerived Pydantic model.
  derived jsonb not null,

  -- Prompt provenance. If the prompt version changes meaningfully, we
  -- want to invalidate stale entries by bumping this and treating mismatched
  -- versions as cache misses.
  prompt_version int not null,

  -- Cost log linkage. Every miss writes a cost_log entry; this references
  -- it so we can answer "how many times has this cache saved us money?"
  source_cost_log_id uuid references public.cost_logs(id) on delete set null,

  created_at timestamptz not null default now()
);

create unique index target_derivations_label_seniority_version_unique
  on public.target_derivations (label_lower, seniority_hint, prompt_version);

-- No RLS — this is a system-level cache, never user-scoped. Service
-- role only.
```

Cache hit avoids a ~$0.012 Sonnet call. With ~8 lateral suggestions per user and ~3 users picking per week initially, even modest reuse pays for the table size.

### 3. Reconciled suggestion prompt

Today's split:

- `app/services/targets/suggest.py::suggest_targets` — onboarding. No `current_targets` arg. System prompt assumes the user is starting from scratch.
- `app/services/targets/lateral_discovery.py::suggest_lateral_targets` — follow-up. Takes `current_targets` for exclusion. System prompt assumes "find adjacent roles".

**Proposed reconciled shape.** One service module, `app/services/targets/suggestions.py`:

```python
from typing import Literal

Mode = Literal["onboarding", "lateral", "explore"]

async def suggest_targets(
    llm: LLMClient,
    *,
    mode: Mode,
    payload: OptimizedPayload,
    current_targets: list[JobTarget] | None = None,
    excluded_labels: set[str] | None = None,
    min_confidence: int = 40,
    max_results: int = 8,
    model: ModelId = "claude-sonnet-4-6",
) -> tuple[list[TargetSuggestion], LLMResult]:
    ...
```

One system prompt with a `## Mode: {mode}` block, three short paragraphs explaining each mode's framing. The profile + exclusion + task sections are shared. The Pydantic output schema (`TargetSuggestion`) is shared — drops the legacy field-naming differences (`label` vs `target_label`, etc).

**Migration of callers.** Existing `suggest_targets` (onboarding) and `suggest_lateral_targets` (lateral) get thin shims that call the new function with the matching mode. Shims removed after one prod cycle confirms parity.

**Why not three separate prompts that share a profile-summary builder?** Tried mentally: the three prompts have ~90% identical guidance ("anchor in evidence", "span industries", "include a stretch") and ~10% mode-specific framing. A `Mode` toggle near the top of the system prompt is the cheapest place to vary the framing without duplicating the rules.

### 4. Confidence floor API

Add `?min_confidence=N` (0-100) to the suggestion endpoints. Server-side default: 40. Reasoning: scores 0-39 are aspirational stretches the LLM is told to leave out; 40-69 are real stretches the user might want to see; 70+ are confident matches. A 40 floor matches today's prompt guidance.

Caller can override:

- `?min_confidence=70` — "only show me obvious matches"
- `?min_confidence=0` — "show me everything you considered" (rare; debug)

FE: a "Show stretch picks" toggle that flips between 40 and 70 in v1. Slider in v2.

### 5. Background activation flow

Activation today (suggested-pick → derive → link → kick off retro-scoring) takes ~5-15s per pick. Multi-pick (4 cards) sequenced today = ~40s of waiting.

Change:

- The new `POST /target-suggestions/{id}/activate` endpoint enqueues the work and returns immediately with `{ status: "activating", target_id: null }`. (No \target_id yet — we don't have one until the cache or derive resolves.)
- A background task does: cache lookup → derive on miss → upsert target → link user → kick off retro-score.
- The FE polls `GET /target-suggestions/{id}` every 2s (or subscribes via Supabase realtime — pick later) until `activated_at` is non-null and `activated_target_id` is populated.
- Cards flip "Activate" → "Activating…" → "Active" without blocking the rest of the UI.

Multi-pick = `POST /target-suggestions/activate-batch` with an array of suggestion IDs. Backend fires the activation tasks concurrently (asyncio.gather). User watches all cards flip in parallel.

### 6. Cap-collision swap UX

When activation would exceed `MAX_ACTIVE_TARGETS_PER_USER` (currently 5):

- API returns `409 Conflict` with a structured body:
  ```json
  {
    "error": "active_targets_at_cap",
    "max_active_targets": 5,
    "current_active": [
      { "target_id": "...", "label": "Director of CX Ops", "fit_score": 78 },
      ...
    ],
    "blocked_suggestion_id": "...",
  }
  ```
- FE renders a modal: "You have 5 active targets. Deactivate which one to make room?" — single-tap list.
- The "swap" endpoint (`POST /target-suggestions/{id}/activate-with-swap`) takes the `replace_target_id` and atomically deactivates one + activates the new one.

## API surface (added)

| Method   | Path                                                                                                | Returns                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/target-suggestions?source={onboarding,lateral,explore}&state={pending,dismissed,saved,activated}` | Paginated list of suggestion rows for the current user                                                                |
| `POST`   | `/target-suggestions/generate`                                                                      | Body: `{ mode, max_results?, min_confidence? }`. Calls the reconciled `suggest_targets`, persists rows, returns them. |
| `POST`   | `/target-suggestions/{id}/dismiss`                                                                  | Sets `dismissed_at`. Idempotent.                                                                                      |
| `POST`   | `/target-suggestions/{id}/save`                                                                     | Sets `saved_at`. Idempotent.                                                                                          |
| `POST`   | `/target-suggestions/{id}/activate`                                                                 | Enqueues activation. Returns `{ status: "activating" }` or `409` cap-collision.                                       |
| `POST`   | `/target-suggestions/activate-batch`                                                                | Body: `{ suggestion_ids: [...] }`. Same per-id semantics.                                                             |
| `POST`   | `/target-suggestions/{id}/activate-with-swap`                                                       | Body: `{ replace_target_id }`.                                                                                        |
| `GET`    | `/target-suggestions/{id}`                                                                          | Single row — used for activation polling.                                                                             |
| `DELETE` | `/target-suggestions/{id}`                                                                          | Hard-deletes (clears the unique-key block on re-offer).                                                               |

## Sequencing (10 small PRs, in order)

| #   | PR                                                                            | What                                                                                                                     | Risk                                    |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| A   | `feat(wyrdfold-api): target_suggestions table + RLS`                          | Just the migration. No code paths use it yet.                                                                            | Low                                     |
| B   | `feat(wyrdfold-api): target_derivations cache table`                          | Just the migration + tiny CRUD helper.                                                                                   | Low                                     |
| C   | `feat(wyrdfold-api): reconcile suggest_targets / suggest_lateral_targets`     | One reconciled module + shims preserving existing endpoints. Behavioral parity test against fixtures from each old path. | Medium — touches a live onboarding flow |
| D   | `feat(wyrdfold-api): /target-suggestions CRUD endpoints`                      | List / dismiss / save / hard-delete + generate (calls reconciled prompt, persists rows). No activation yet.              | Low (additive)                          |
| E   | `feat(wyrdfold-api): wire derive cache into derive_profile_from_label`        | Read-through cache. No FE change.                                                                                        | Low                                     |
| F   | `feat(wyrdfold-api): /target-suggestions/{id}/activate + background job`      | Activation pipeline as a background task. Cap-collision returns 409 with structured body.                                | Medium                                  |
| G   | `feat(wyrdfold-api): /target-suggestions/activate-batch + activate-with-swap` | Multi-pick + swap. Builds on F.                                                                                          | Low                                     |
| H   | `feat(wyrdfold): lateral discovery review/pick UI`                            | New page or panel; consumes endpoints from D-G. List / dismiss / save / activate with optimistic UI and polling.         | Medium (new FE surface)                 |
| I   | `feat(wyrdfold): "show stretch picks" + confidence floor toggle`              | Small UI knob on the discovery page.                                                                                     | Low                                     |
| J   | `feat(wyrdfold): swap-target modal for cap-collision flow`                    | Triggered by 409 from activate.                                                                                          | Low                                     |

Estimated total: ~3-4 days of focused work for backend (A-G), ~2-3 days for frontend (H-J).

## Risks & open questions

- **Reconciled prompt regression.** Merging two prompts risks degrading onboarding-time suggestions (where users have no current targets and the model has less context). Mitigation: PR C ships behind a feature flag, runs both prompts in shadow for a week, and only switches on parity check.
- **Cache invalidation.** A user picks the cached "Director of CX Ops" slim shape from 4 months ago; meanwhile the slim-target prompt has improved twice. Mitigation: `prompt_version` in the cache row, bumped any time the prompt changes meaningfully. Mismatched versions = cache miss (and an opportunity to re-derive for one user; result populates a fresh cache row).
- **Background activation observability.** If the background job fails after enqueueing, the card stays "Activating…" forever. Mitigation: timeout the polling endpoint at 60s and surface an error toast + a retry button; record failures in `target_suggestions.activation_error` for audit.
- **Supabase realtime vs polling.** Polling is simpler and works fine for the activation use case (small N, short windows). Realtime would feel snappier but adds complexity. Default to polling; revisit if users complain.

## Out of scope (intentionally)

- **Per-vertical industry filter chips on the discovery page** — defer until usage justifies the UI surface.
- **"Show why this lateral matters" — confidence band grouping** — depends on UI design exploration; not blocking.
- **Saved-for-later batching ("review my saved 6 weekly")** — a notification surface, separate workstream.
- **Cross-user dedup via canonicalized labels** — too much normalization machinery for v2; the per-user dedup index is sufficient.
- **Removing the legacy shims (PR C cleanup)** — separate PR after one production cycle of parity.

## Connection to other plans

- **Streamlined target creation** (`plan-wyrdfold-streamlined-target.md`): the reconciled prompt outputs the same slim shape this plan derives. Schema lock-in confirmed.
- **Logistics chips** (`plan-wyrdfold-logistics-chips.md`): independent. Discovery surfaces suggestions; chips surface filters on the resulting job lists.
- **Phase 3 deep dive** (migration plan #8): when shipped, activating a suggestion could auto-trigger a deep-dive on the top-fit job for that target — but that's a workflow optimization, not a v2 requirement.
