# Fitted Cleanup Tracker

Branch: `chore/cleanup` (off `feature/fitted`)
Parent issue: [#493 — Fitted Job Search Command Center](https://github.com/danieljoffe/danieljoffe.com/issues/493)

## Approach

- One audit-phase per issue-phase (1:1 mapping).
- Each audit-phase produces a doc enumerating sub-issues, code map, findings, and fixes applied.
- Findings are triaged and fixed in the same audit-phase before moving on (small chunks → no context loss).
- This doc is the index. See per-phase docs for detail.

## Status

| Audit Phase | Issue Phase                        | Sub-issues          | Doc                                    | Status      |
| ----------- | ---------------------------------- | ------------------- | -------------------------------------- | ----------- |
| 0           | Phase 0 — Foundation               | #494 #495 #496      | [audit-phase-0.md](./audit-phase-0.md) | ✅ complete |
| 1           | Phase 1 — Experience               | #497 #498 #499      | [audit-phase-1.md](./audit-phase-1.md) | ✅ complete |
| 2           | Phase 2 — Scoring & Manual         | #500 #501 #502      | [audit-phase-2.md](./audit-phase-2.md) | ✅ complete |
| 3           | Phase 3 — Resume Pipeline          | #503 #504 #505      | _pending_                              | ⏳          |
| 4           | Phase 4 — Fitted UI                | #506 #507 #508 #509 | _pending_                              | ⏳          |
| 5           | Phase 5 — Notifications & Insights | #510 #511 #512      | _pending_                              | ⏳          |
| Related     | —                                  | #407 (Firecrawl)    | _pending_                              | ⏳          |

## Conventions

- **Status icons**: ✅ shipped · 🟡 partial / needs work · ❌ missing · 🗑️ dead/superseded
- Each finding cites `path/to/file.py:line` so the fix is one click away.
- Fixes are applied as small focused commits during the audit-phase, then logged in the doc's "Fixes applied" section.
