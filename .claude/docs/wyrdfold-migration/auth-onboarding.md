# Auth + Onboarding + Login Surfaces — Wyrdfold Migration Audit

Issue: #588 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

The Fitted auth surface is already Supabase-native (magic link via
`supabase.auth.signInWithOtp`) — **no rewrite required**. Auth
ports to Wyrdfold mostly as a copy + path-rename exercise.

The onboarding wizard is decoupled and reusable (one
`ConversationChat` import is the only Fitted-coupling). All
hardcoded `/fitted` paths are easy `s/\/fitted/\/wyrdfold/`
substitutions.

The single architectural decision worth flagging: middleware
(`apps/root/src/proxy.ts`) currently bundles **CSP**, **admin
JWT auth for /tools/admin**, and **Supabase auth for /fitted/\***
in one file. For Wyrdfold the admin-JWT block disappears and
the `/fitted/*` block becomes the entry-point for every
authenticated route.

## 1. Surface inventory

```
apps/root/src/app/fitted/
├── layout.tsx                   # /fitted layout wrapper (force-dynamic, robots: noindex)
├── login/
│   ├── page.tsx                 # server: read ?next= search param
│   └── MagicLinkForm.tsx        # client: signInWithOtp + cookie stash
├── auth/
│   └── callback/
│       └── route.ts             # GET /fitted/auth/callback — exchangeCodeForSession
├── onboarding/
│   ├── page.tsx                 # server: redirect if !user
│   ├── OnboardingWizard.tsx     # 130 LOC — branching paths A/B/C
│   ├── PathChooser.tsx          # 84 LOC — three onboarding paths
│   ├── ResumeUploader.tsx       # 206 LOC — upload + parse
│   ├── JobUrlInput.tsx          # 179 LOC — paste a job URL
│   ├── TargetSuggestions.tsx    # 419 LOC — pick targets to start tracking
│   ├── CompletionScreen.tsx     # 42 LOC
│   └── (no test files)          ← gap, see #594
└── (app)/layout.tsx             # auth backstop after middleware
```

Plus middleware: `apps/root/src/proxy.ts` (Next.js 16 calls this
"proxy", same matcher concept as the legacy `middleware.ts`).

## 2. Auth flow — end-to-end

```
1. User visits /fitted/jobs
2. proxy.ts → handleFittedAuth → supabase.auth.getUser() → null
3. proxy.ts redirects to /fitted/login?next=/fitted/jobs
4. /fitted/login renders MagicLinkForm; user submits email
5. MagicLinkForm:
     - stashes `next` in `fitted_login_next` cookie (10min)
     - calls supabase.auth.signInWithOtp({ email, emailRedirectTo: /fitted/auth/callback })
     - shows "Check your email"
6. Email arrives; user clicks magic link
7. Supabase redirects to /fitted/auth/callback?code=...
8. callback route reads `fitted_login_next` cookie, calls
     supabase.auth.exchangeCodeForSession(code)
9. On success: redirect to safeNext(cookie value) || /fitted; clear cookie
10. proxy.ts now finds the session; allows the request through
11. (app)/layout.tsx server-side re-checks session as a backstop
     against router-cache replay
```

The double auth check (proxy + (app) layout) is intentional and
documented at `(app)/layout.tsx:7-11`: Next.js Router Cache can
replay a previously-rendered RSC payload before middleware runs,
so the layout enforces auth a second time.

## 3. Why this design works as-is for Wyrdfold

- **No password storage, no email-verification flow to build** —
  Supabase handles both via OTP magic link.
- **`safeNext()` open-redirect guard** present in both
  `proxy.ts` and `auth/callback/route.ts` — same logic in two
  places, but defending different attack surfaces (request-time
  vs. callback-time). Don't dedupe; the duplication is correct.
- **Cookie-based `next` instead of URL-based `next`** — solves a
  real Supabase quirk: Supabase strips query strings off the
  redirect URL when it doesn't match the project's allowlist
  (silently falls back to the Site URL). Documented at
  `MagicLinkForm.tsx:26-33`.
- **`force-dynamic`** on `layout.tsx` ensures the shell is never
  cached at build time (would leak between users).
- **`robots: { index: false }`** on the layout keeps the whole
  app out of search engines (correct for the audit-tool admin
  case; reconsider for Wyrdfold once it has marketing pages).

## 4. /fitted hardcoded paths — substitution plan

```
apps/root/src/proxy.ts:14        const ADMIN_SESSION_COOKIE = 'admin_session'  ← DELETE
apps/root/src/proxy.ts:15        const FITTED_DEFAULT = '/fitted'
apps/root/src/proxy.ts:126-150   '/fitted/login', '/fitted/auth' route checks
apps/root/src/proxy.ts:200       matcher: '/fitted/:path*'
apps/root/src/app/fitted/login/MagicLinkForm.tsx:57   /fitted/auth/callback
apps/root/src/app/fitted/auth/callback/route.ts:5,57  '/fitted', '/fitted/login'
apps/root/src/app/fitted/(app)/layout.tsx:24          /fitted/login redirect
apps/root/src/app/fitted/onboarding/page.tsx:17       /fitted/login redirect
```

For the Wyrdfold scaffold:

1. Top-level route group rename `/fitted` → `/` (Wyrdfold-app
   root) or `/wyrdfold` (if mounted in apps/root)
2. Replace `fitted_login_next` cookie name with `wyrdfold_next`
3. Replace `'admin_session'` cookie + `isValidAdminSession()`
   helpers entirely (already documented in #590 as part of the
   API auth rewrite)
4. Update `MagicLinkForm` heading copy ("Sign in to Fitted" →
   "Sign in to Wyrdfold")
5. Update the email-template OTP body in Supabase Auth settings
   (separate Wyrdfold project, already a separate Supabase per
   #592)

## 5. CSP — applies workspace-wide, not just /fitted

`proxy.ts:48-69` builds CSP with:

- nonce-based script-src (`'nonce-${nonce}' 'strict-dynamic'`)
- HCAPTCHA, Storybook, Calendly explicitly allowed in `frame-src`
- `connect-src 'self' ${allowedOrigins}` — list lives in
  `@/utils/constants`

For Wyrdfold:

- HCAPTCHA: keep if Wyrdfold has any unauth surface (sign-up
  form, contact). If Pyre is admin-only at v1, drop hcaptcha.
- Calendly: drop (audit-tool–specific)
- Storybook: keep for parity

## 6. Onboarding architecture

`OnboardingWizard` defines three deterministic paths (A/B/C)
keyed off `PathChooser`. Path step lists are static:

```ts
A: ['path-chooser', 'upload-resume', 'add-job', 'pick-targets', 'completion'];
B: ['path-chooser', 'upload-resume', 'pick-targets', 'completion'];
C: ['path-chooser', 'conversation', 'pick-targets', 'completion'];
```

Step transitions are local-state only (`useState<Step>`). No
durable state — if a user closes the tab mid-onboarding they
restart at path-chooser. Acceptable for v1; revisit if drop-off
analytics show high mid-flow abandon.

Step-content components (`ResumeUploader`, `JobUrlInput`,
`TargetSuggestions`, `CompletionScreen`) call BFF API routes
(`/api/career/experience/upload-resume`, `/api/targets/suggest`,
etc.). Those move with #590.

## 7. ConversationChat coupling (path C)

`OnboardingWizard.tsx:8` imports
`../_components/ConversationChat` for path C. This is the only
non-onboarding import in the wizard. The chat component itself
(`apps/root/src/app/fitted/_components/ConversationChat.tsx`)
is the career-decision-tool chat experience, used by:

- `OnboardingWizard.tsx` (path C)
- `(app)/profile/ProfilePage.tsx`
- `(app)/DashboardPage.tsx`

For Wyrdfold:

- All three sites move together — ConversationChat stays paired
  with profile + dashboard
- No promotion to `shared-ui` (it's domain-specific career-tool
  UX, not generic chat — see #589 audit)

## 8. Accessibility checklist (already passing)

- `MagicLinkForm`: `aria-label='Email address'` on input,
  `aria-describedby='login-error'`, `role='alert'` on error,
  `data-sentry-mask` on PII input ✓
- `OnboardingWizard`: focus moves to step container on
  transition (`useEffect` + `tabIndex={-1}` + `outline-none`),
  step container has `aria-label` ✓
- `ProgressBar` from shared-ui has `aria-label` set per step ✓

This passes the a11y bar — port verbatim.

## 9. Open questions for Wyrdfold

1. **Anonymous browse?** The current Fitted app is auth-walled
   end-to-end. Should Wyrdfold expose any unauth read-only
   surface (career tool demo, pricing page)? If yes, the
   middleware matcher needs an allowlist beyond `/login`,
   `/auth`. **Recommendation: keep auth-walled v1; expose demo
   surfaces post-launch.**
2. **Email vs. password for auth.** OTP magic link is fine for
   v1 single-user audit-tool. Wyrdfold-as-public-product may
   want password auth + Google OAuth. Both are
   `supabase.auth.*` one-liners on top of what exists.
3. **Onboarding skip.** Currently `handleSkip → /fitted/targets`
   (hardcoded). For Wyrdfold either preserve targets-first
   landing or rethink the post-skip destination (e.g.,
   conversation chat as default landing for path C exit).
4. **Admin role.** Current single-tenant model treats every
   authenticated Supabase user as full admin. Wyrdfold needs no
   role differentiation v1, but the JWT claims path is open
   (Supabase JWT custom claims) when needed.

## 10. Decision summary

| Question                                   | Answer                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Does auth need a rewrite?                  | **No** — already Supabase magic-link OTP                                           |
| How many files port?                       | 11 (login + auth + onboarding + 3 wizard step components shared with the app)      |
| Hardcoded `/fitted` paths in auth surface? | 8 occurrences, all trivial substitutions                                           |
| Onboarding state durable?                  | No — rerun-from-scratch on tab close (acceptable)                                  |
| ConversationChat shareable?                | No — career-domain-coupled, moves with Wyrdfold                                    |
| CSP changes?                               | Drop Calendly, audit hcaptcha need                                                 |
| Middleware split needed?                   | Keep one `proxy.ts`; remove the `/tools/admin` block when audit-tool retires admin |

## 11. Wyrdfold port checklist

- [ ] Copy `proxy.ts` with `/wyrdfold` prefix and Wyrdfold-only
      blocks; delete admin-JWT branch
- [ ] Copy `lib/supabase/auth-{server,client}.ts` (no changes
      needed — already use `NEXT_PUBLIC_SUPABASE_*` env)
- [ ] Copy `login/`, `auth/callback/`, `onboarding/`
- [ ] Substitute `/fitted` → wyrdfold prefix, `fitted_login_next`
      cookie name, "Fitted" branding strings (3 hits)
- [ ] Configure Supabase project: enable Email auth, set Site URL,
      add `wyrdfold.com/auth/callback` to Redirect URLs allowlist
- [ ] Customize OTP email template in Supabase dashboard
- [ ] Add unit tests for `safeNext()` + middleware redirect
      logic — currently zero test coverage for proxy.ts (gap
      flagged for #594)
- [ ] E2E test: full magic-link flow on dev.wyrdfold.com

## 12. Collisions

The other session is editing `apps/job-api/services/llm/*` and
`apps/job-api/routers/tailor.py`. **No overlap** with the auth
surface. This audit modifies docs only.
