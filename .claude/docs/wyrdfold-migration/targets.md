# Targets Surface — Wyrdfold Migration Audit

Issue: #584 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

The targets surface is **13 files / ~1,966 LOC** with clean
separation between list view, detail view, and modals. It depends
on shared-ui (Card, Heading, Badge, Modal, Spinner, Skeleton)
plus 16 BFF API routes (audited in #590) and zero external
services beyond what job-api provides.

**Coupling notes:**

- 4 hardcoded `/fitted/...` paths — trivial substitutions
- Zero direct Supabase calls (all data flows through `/api/targets/*`)
- Zero non-shared-ui external imports (no GSAP, no charts here)
- **Zero unit/spec tests** — gap flagged for #594

Largest file: `ScoringProfileEditor.tsx` at 579 LOC. This is a
domain-specific keyword-weight editor (categories, seniority,
domain, negative). Worth a refactor — but **not** in the migration
scope. Port as-is.

## 1. Surface inventory

```
apps/root/src/app/fitted/(app)/targets/
├── page.tsx                      10  server: renders TargetsList
├── loading.tsx                   21  Skeleton list
├── types.ts                      97  ScoringProfile, JobTarget, MatchedSuggestion + emptyScoringProfile()
├── TargetsList.tsx              453  client: list + create/activate/deactivate/delete + suggestions
├── TargetCard.tsx               138  client: list-row UI (Card)
├── PendingTargetCard.tsx         47  client: optimistic placeholder
├── CreateTargetModal.tsx        173  client: tab between manual/from-URL
└── [id]/
    ├── page.tsx                  15  server: renders TargetDetail
    ├── loading.tsx                5  passthrough Skeleton
    ├── TargetDetail.tsx         191  client: edit metadata + reference JDs
    ├── TargetDetailSkeleton.tsx   39
    ├── ScoringProfileEditor.tsx 579  client: keyword/weight editor (categories, seniority, domain, negative)
    ├── ReferenceJDList.tsx      139  client: list/delete reference JDs
    └── AddReferenceJDModal.tsx  156  client: paste/upload JD → derive scoring profile
```

## 2. API endpoints consumed (16)

```
GET    /api/targets/mine                              → list
POST   /api/targets/from-manual                       → create (manual)
POST   /api/targets/from-url                          → create (URL)
GET    /api/targets/[id]                              → detail
PATCH  /api/targets/[id]                              → update label / scoring profile
DELETE /api/targets/[id]                              → delete
POST   /api/targets/[id]/activate                     → toggle on
POST   /api/targets/[id]/deactivate                   → toggle off
POST   /api/targets/[id]/link                         → link existing target (suggestion match)
POST   /api/targets/suggest                           → request LLM suggestions from master doc
GET    /api/targets/[id]/reference-jds                → list refs
POST   /api/targets/[id]/reference-jds                → add ref + derive
DELETE /api/targets/[id]/reference-jds/[refId]        → delete ref
POST   /api/targets/[id]/derive-profile               → re-derive from refs
GET    /api/targets/[id]/status                       → activation status
GET    /api/targets/active                            → active targets only
```

All proxy to `apps/job-api/app/routers/targets.py` per #590 §3 and
#591 §3.

## 3. Hardcoded /fitted paths

```
TargetsList.tsx:111      router.push(`/fitted/jobs?target=${id}`)
TargetCard.tsx:54        href={`/fitted/targets/${target.id}`}
TargetDetail.tsx:105     <Link href='/fitted/targets'>
TargetDetail.tsx:115     href='/fitted/targets'
```

Four substitutions for the Wyrdfold port. The `?target=${id}`
query-string contract with the jobs surface is **the** coupling
point between targets and jobs — preserve it.

## 4. shared-ui usage

| Component              | Files importing                                                  |
| ---------------------- | ---------------------------------------------------------------- |
| `Card` / `CardContent` | TargetsList, TargetCard, PendingTargetCard, ScoringProfileEditor |
| `Heading`              | TargetsList, ScoringProfileEditor, TargetDetail, TargetCard      |
| `Badge`                | TargetsList, TargetCard, ScoringProfileEditor, TargetDetail      |
| `Skeleton`             | TargetsList (count: 6), loading.tsx files, TargetDetailSkeleton  |
| `Spinner`              | TargetsList, ScoringProfileEditor                                |
| `Text`                 | TargetsList, ScoringProfileEditor                                |
| `Modal`                | CreateTargetModal, AddReferenceJDModal                           |
| `Input`                | ScoringProfileEditor                                             |

All ports cleanly to a Pyre-themed shared-ui (#593) — no app-specific
shared-ui forks needed.

## 5. State + data-flow patterns

- **Local React state only** — no Zustand, no Redux, no SWR, no
  TanStack Query. Every mutation does `fetch(...)` then refetches.
- **Optimistic UI** for create-from-suggestion path:
  `PendingTargetCard` renders while `/api/targets/suggest` →
  `/api/targets/from-manual` round-trip completes
  (`TargetsList.tsx:198-260`).
- **Toast feedback** via `useToast()` for every mutation —
  consistent with the rest of the codebase.
- **No URL-state sync** — filters/sorts (none currently) would
  need to be added if Wyrdfold introduces them.

## 6. Domain-specific patterns to preserve

### `ScoringProfile` shape (types.ts)

The four-bucket weight model is the heart of the targeting feature:

```ts
{
  categories: { [name]: { keywords: { [kw]: 1|2|3 }, weight: number } },
  seniority: { level: string|null, signals: string[] },
  domain:   { signals: string[], weight: number },
  negative: { keywords: string[], weight: number },  // weight is negative
}
```

Default factory `emptyScoringProfile()` is exported and used in
the editor. **Do not change the shape during the port** — the
job-api `targets` table stores this as JSONB and the scoring
function in `app/services/scoring.py` reads it directly.

### Reference-JD-driven profile derivation

`AddReferenceJDModal` posts a JD URL or text → `/api/targets/[id]/reference-jds`.
The job-api LLM call (`derive_scoring_profile_from_jd`) returns a
fresh ScoringProfile, which then merges into the target's profile
(see `derive-profile` endpoint).

This is a **migration-load-bearing pattern** — Wyrdfold must
preserve both the endpoint contract and the merge semantics, or
existing user targets get corrupted on first re-derive.

## 7. Testing coverage gap

```
$ find apps/root/src/app/fitted/(app)/targets -name '*.test.tsx'
(no results)
```

**Zero unit tests for the targets surface.** This is the largest
test-coverage gap in any of the audited surfaces. Worth at minimum:

- `TargetsList.test.tsx` — list render, activate/deactivate
  optimistic updates, suggestion match flow
- `ScoringProfileEditor.test.tsx` — edit category, add keyword,
  validate weight bounds
- `TargetDetail.test.tsx` — fetch, edit, save round-trip

E2E coverage (Playwright) likely also missing — verified in #594.

## 8. Wyrdfold port checklist

- [ ] Copy 13 files from `apps/root/src/app/fitted/(app)/targets/`
      to wyrdfold app's targets route
- [ ] Substitute 4 hardcoded `/fitted/...` paths
- [ ] Re-import shared-ui (still works — same package name)
- [ ] Re-import `@/components/Button` and `@/state/Toast/ToastProvider`
      (port these helpers separately or factor a shared `apps/wyrdfold`
      copy — see #589 ADR)
- [ ] Wire to wyrdfold's `/api/targets/*` routes (matches the
      job-api router contract; only auth header differs per #590)
- [ ] Add unit tests (target: 80% line coverage of mutation paths)
- [ ] Add Playwright E2E spec for create→view→edit→delete round-trip

## 9. Open questions

1. **Pyre theme audit for ScoringProfileEditor.** This component
   uses a lot of color (Badge variants for keyword weights 1/2/3,
   negative, etc.). Verify chartreuse-on-near-black still produces
   readable variants. Likely fine but worth a Storybook smoke test.
2. **Skeleton count tuning.** TargetsList renders 6 placeholder
   cards on first paint. For Wyrdfold's narrower v1 use, consider
   reducing to 3 to avoid layout flash on small target lists.
3. **`fit_score` field nullable.** The JOIN of `user_targets` +
   `targets` returns `fit_score: number | null`. The UI handles
   null but the rendering is inconsistent (sometimes em-dash,
   sometimes "Not scored"). Tighten the convention during port.
4. **Suggestion flow auth.** `/api/targets/suggest` triggers an
   LLM call against the user's master doc. Wyrdfold's onboarding
   may need a "skip suggestion" flag for users who haven't
   uploaded a master doc yet — currently the suggestion endpoint
   returns empty silently rather than guiding the user.

## 10. Decision summary

| Question                        | Answer                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| Files to port                   | 13 (~1,966 LOC)                                                     |
| API endpoints to port           | 16 (already audited in #590)                                        |
| Domain types in scope           | `ScoringProfile`, `JobTarget`, `TargetReferenceJD` (preserve shape) |
| External deps beyond shared-ui? | None                                                                |
| Test coverage status            | **Zero** — must backfill (covered by #594)                          |
| Hardcoded `/fitted` paths       | 4 trivial substitutions                                             |
| Largest refactor opportunity    | `ScoringProfileEditor.tsx` (579 LOC) — **defer past migration**     |

## 11. Collisions

The other session is editing `apps/job-api/services/llm/*` and
`apps/job-api/routers/tailor.py`. **No overlap** with the targets
surface (apps/root/src/app/fitted/(app)/targets/). This audit
modifies docs only.
