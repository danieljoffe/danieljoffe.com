# Profile + Settings Surfaces — Wyrdfold Migration Audit

Issue: #587 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

Two adjacent surfaces, **7 files / ~1,470 LOC** combined:

- **Profile** (`profile/`, 4 files, ~997 LOC) — master document
  - derived skills/roles/outcomes + SSE-streamed re-derive + gap
    health. ProfilePage.tsx is **864 LOC** (the largest single
    client component on the Fitted surface — barely edges out
    ResumeReviewPage at 503 LOC). Coherent, but a refactor
    candidate.
- **Settings** (`settings/`, 3 files, ~473 LOC) — three
  per-section save cards: Profile (PII identity), Email
  Notifications (Resend), SMS Notifications (Twilio).

External deps: **none beyond shared-ui + lucide-react**.
No Recharts, no markdown editor, no drag-drop. The most
sophisticated thing happening is SSE streaming JSON for the
"Re-derive" feature on Profile.

Port complexity: **medium**. Profile's file upload + SSE +
partial JSON parsing requires careful re-wiring. Settings is
straightforward forms.

## 1. Surface inventory

```
apps/root/src/app/fitted/(app)/profile/
├── page.tsx                  10
├── loading.tsx               18   shared-ui Skeleton scaffold
├── types.ts                 105   mirrors Pydantic shapes in job-api
└── ProfilePage.tsx          864   client orchestrator

apps/root/src/app/fitted/(app)/settings/
├── page.tsx                  10
├── loading.tsx               14
└── SettingsPage.tsx         449   3 cards, per-section save
```

Both `page.tsx` files set `metadata.title` and re-export the
client component. Trivial.

## 2. API endpoints (8)

### Profile (6)

```
GET  /api/career/experience/optimized        // OptimizedDoc | { optimized: null }
GET  /api/career/experience/gap-health       // GapHealthResult
GET  /api/career/experience/prose            // ProseDoc | { prose: null }
POST /api/career/experience/prose            // save master doc
POST /api/career/experience/prose/consolidate// dedupe pass
POST /api/career/experience/upload-resume?auto_derive=true  // multipart
POST /api/career/experience/derive/stream    // SSE: delta/done/error
```

### Settings (2)

```
GET  /api/profile/notifications              // NotificationPreferences
PATCH /api/profile/notifications             // partial: email or sms section
GET  /api/profile/identity                   // IdentityFields
PATCH /api/profile/identity                  // full identity replace
```

All 8 are BFF proxies to job-api (audited in #590).

## 3. Hardcoded /fitted paths

```
profile/ProfilePage.tsx:400   href='/fitted/onboarding'
```

**One** path. Settings has zero. Trivial substitution.

## 4. Cross-file dependencies

### Profile imports

| Import                  | Where it lives                                    |
| ----------------------- | ------------------------------------------------- |
| `consumeSse`            | `@/lib/consumeSse` — used by ConversationChat too |
| `parsePartialJson`      | `@/lib/parsePartialJson` — same                   |
| `ConversationChatModal` | `apps/root/src/app/fitted/_components/`           |
| `useToast`              | `@/state/Toast/ToastProvider`                     |
| `Button`                | `@/components/Button`                             |

`ConversationChatModal` is shared between profile (gap-fill
mode) and the standalone `/fitted/onboarding` flow. Port both
together.

### Settings imports

Only shared-ui + Button + useToast. No app-local cross-deps.

## 5. shared-ui usage

| Component                       | Profile | Settings |
| ------------------------------- | ------- | -------- |
| Alert                           | ✓       |          |
| Badge                           | ✓       |          |
| Card / Header / Title / Content | ✓       | ✓        |
| Heading                         | ✓       | ✓        |
| Input                           |         | ✓        |
| ProgressBar                     | ✓       |          |
| Skeleton                        | ✓       | ✓        |
| Spinner                         | ✓       | ✓        |
| Switch                          |         | ✓        |
| Text                            | ✓       | ✓        |

12 distinct shared-ui components across both surfaces. All
audited as Pyre-ready in #593.

## 6. SSE streaming pattern (Profile)

The `Re-derive` action streams an LLM response and parses
partial JSON mid-stream so the user sees the resume materialize
instead of staring at a spinner:

```ts
let buffered = '';
await consumeSse(res, (event, data) => {
  if (event === 'delta') {
    buffered += (data as { text?: string }).text ?? '';
    const parsed = parsePartialJson<Partial<OptimizedPayload>>(buffered);
    if (parsed) setStreamingPayload(parsed);
  } else if (event === 'done') {
    setOptimized((data as { doc: OptimizedDoc; cached?: boolean }).doc);
  } else if (event === 'error') { ... }
});
```

Two SSE events drive UX:

- `delta` — incremental text chunks; parsed permissively as
  partial JSON (`Partial<OptimizedPayload>`) so render guards
  each field
- `done` — payload swap to the persisted `OptimizedDoc`
- `error` — surfaced via toast

The display payload type is intentionally **permissive**
(`Partial<Role>[]` etc.) because mid-stream objects are
half-formed:

```ts
type DisplayPayload = {
  summary: string | null;
  roles: Partial<Role>[];
  skills: Partial<Skill>[];
  outcomes: Partial<Outcome>[];
};
```

This pattern is **load-bearing** for the streaming UX. Port
the `consumeSse` + `parsePartialJson` helpers verbatim and
keep the permissive display type. Don't tighten to strict
`Role[]` — it'll crash mid-stream.

## 7. File upload (Profile)

```ts
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

Hidden `<input type='file' aria-hidden>` triggered via
`fileInputRef.current?.click()`. POST is multipart with
`?auto_derive=true` so a successful upload also kicks off the
derive pipeline server-side. Toast on success/failure; refetch
on success.

Migration note: the 10 MB cap is duplicated server-side in
job-api (audited in #591). If Wyrdfold's product wants larger
files, change in **both** places.

## 8. Per-section save pattern (Settings)

Recent change (`70bf4640 feat(fitted): per-section save on
Settings`) split a single global save into three independent
section saves: profile / email / sms. Driver:

```ts
type Section = 'profile' | 'email' | 'sms';
const [savingSection, setSavingSection] = useState<Section | null>(null);
```

Each card's save button shows a Spinner while
`savingSection === ownSection`. Each section's PATCH targets a
different endpoint (`/identity` or `/notifications`) and only
sends its own keys. Server merges.

Port verbatim — this is good UX (saving phone number doesn't
require also re-validating PII identity).

## 9. Provider availability gating

Settings server returns `email_available` and `sms_available`
flags reflecting whether the operator has configured Resend
(SMTP) and Twilio credentials. UI:

- Switches are **disabled + forced off** when unavailable
- Inline `Text` row explains why ("until the operator
  configures…")
- Save button is disabled

This was a deliberate pre-launch fix (commit `e0145453`). Port
as-is; Wyrdfold likely needs the same gating until its own
provider keys are wired.

## 10. PII handling (Settings)

Identity card collects: **name, email, phone, location,
linkedin_url, website_url**. Per coding-conventions.md, all
PII inputs should have `data-sentry-mask`. Current
implementation uses `<Input>` from shared-ui — **verify the
shared-ui Input component forwards `data-*` attrs and that
SettingsPage actually passes `data-sentry-mask`**.

> **Audit gap:** I did not see `data-sentry-mask` on the
> identity inputs. Add this in #595 platform-readiness, or
> file a separate Wyrdfold-side ticket.

Server-side normalization (E.164 phone, URL canonicalization)
happens in job-api and the response re-syncs the form, so the
displayed value matches what's stored. Preserve this pattern.

## 11. Cross-surface coupling

- **Profile ← Onboarding:** "Start with AI" button on zero
  state links to `/fitted/onboarding` (the only hardcoded
  /fitted path). ConversationChatModal is the same component
  the onboarding flow uses, just opened in modal mode for
  gap-fill.
- **Profile ← Jobs (resume tailoring):** Profile's
  `OptimizedDoc` is the source for tailored resumes
  (audited in #585). Migration ordering: port profile + types
  first, then jobs/resume can import them.
- **Settings ← Notifications:** Settings configures Resend +
  Twilio thresholds; the actual sender lives in job-api
  cron/worker (audited in #591). Settings is just a control
  panel.
- **No coupling between Profile and Settings** despite both
  being "user-facing config." Migrate independently.

## 12. Type contracts

`profile/types.ts` is intentionally a **mirror** of Pydantic
shapes in `apps/job-api/app/models/experience.py` and
`conversation.py`. Drift here = runtime bugs.

The pinch point is the discriminated unions:

```ts
export type ProseResponse = ProseDoc | { prose: null };
export type OptimizedResponse = OptimizedDoc | { optimized: null };
export function hasProse(value: ProseResponse): value is ProseDoc {
  return 'id' in value;
}
```

These work because the API uses `{ prose: null }` (not just
`null`) when empty. Verify the Wyrdfold API contract preserves
this shape, or change both.

`GAP_KIND_LABELS` and `GAP_KIND_WEIGHTS` are display-only
mappings that should stay client-side — no server contract.

## 13. Refactor candidates (don't block on)

- **ProfilePage.tsx at 864 LOC** has 6 distinct features:
  zero-state, document health card, master document
  edit/view, experience list, skills grid, gaps list. Each
  could be a sub-component. The `GapsList` is already
  extracted at the bottom — extend the pattern. Estimated
  ~3 sub-components would bring the main component to
  ~400 LOC. **Defer until after migration**; the file works
  and a refactor is unrelated to porting.
- **fileInputRef pattern** appears 3+ times across Fitted
  surfaces (profile, jobs new, conceivably more). If a 4th
  shows up post-migration, extract a `useFilePicker` hook.

## 14. Wyrdfold port checklist

- [ ] Copy 7 files from
      `apps/root/src/app/fitted/(app)/{profile,settings}/`
- [ ] Copy `apps/root/src/lib/consumeSse.ts` and
      `parsePartialJson.ts`
- [ ] Copy
      `apps/root/src/app/fitted/_components/ConversationChat*.tsx`
- [ ] Substitute 1 hardcoded `/fitted/onboarding` path
- [ ] Re-wire 8 BFF endpoints (audited in #590)
- [ ] **Add `data-sentry-mask` to all 6 identity Input
      fields** in SettingsPage if not already passed through
- [ ] Verify shared-ui `Input` forwards `data-*` attrs
- [ ] Confirm 10 MB upload cap matches Wyrdfold's job-api
      config (or update both)
- [ ] Confirm ProseResponse / OptimizedResponse "empty"
      shapes match the Wyrdfold API
- [ ] Add unit tests for: `parsePartialJson` (already tested
      in jobs flow per #585), per-section save state machine,
      provider availability gating
- [ ] E2E tests: upload happy path, derive happy path,
      gap-fill chat, identity save with E.164 normalization

## 15. Open questions

1. **PII masking gap.** Identity inputs in Settings collect
   email/phone/name without an obvious `data-sentry-mask`.
   Either the shared-ui `<Input>` adds it automatically (need
   to verify) or it's missing. Track in #595.
2. **Streaming derive cost.** Re-derive POSTs to an LLM
   stream — every click costs tokens. Profile's `cached`
   flag in the `done` event short-circuits and toasts
   "Profile already up to date." Verify Wyrdfold preserves
   the cache check; otherwise users pay every refresh.
3. **Master document size.** The textarea has no character
   cap. job-api validation (audited in #591) enforces a
   limit; the UI doesn't preview it. Consider client-side
   counter post-migration.
4. **Onboarding entry point.** The zero-state "Start with
   AI" button is the only entry to `/fitted/onboarding` from
   the app shell. If onboarding becomes a separate top-level
   route in Wyrdfold, update both the link and the
   navigation entry.

## 16. Decision summary

| Question                       | Answer                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Files to port                  | 7 (~1,470 LOC) + 2 lib helpers + 2 chat-modal files                                |
| API endpoints                  | 8 (audited in #590)                                                                |
| External deps beyond shared-ui | None (lucide-react already used everywhere)                                        |
| Existing test coverage         | 0 — no tests on either surface                                                     |
| `/fitted` substitutions        | 1 hit (`/fitted/onboarding` in ProfilePage)                                        |
| Refactor candidates            | ProfilePage.tsx 864 LOC could split into 3-4 sub-components — defer post-migration |
| PII concern                    | Verify `data-sentry-mask` flows through shared-ui Input on identity fields         |

## 17. Collisions

The other session is editing `apps/job-api/`. **No overlap**
with profile/settings UI. This audit modifies docs only.
