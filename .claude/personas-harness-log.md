# Harness audit log

One line per `/personas:harness` run, newest at the bottom.
`YYYY-MM-DD · <verdict> · H:<n> M:<n> L:<n> · areas:<...> · <summary>`

- `2026-06-15` · CRITICAL · H:2 M:4 L:3 · areas:dedup,dead-config,hygiene,context,feedback · dead `apps/job-api/**` glob in python.md; local personas duplicate plugin personas; "security review" defined 3× with no use-which-when; nx skills name-collide with nx plugin. (Grounding correction: `security-reviewer` is NOT orphaned — pr-review routes `security` → `security-reviewer` via subagent_type indirection.)
- `2026-06-15` · NEEDS-ATTENTION · H:0 M:2 L:4 · areas:dead-config,hygiene · second pass after fixes: pruned wyrdfold/job-api extraction residue — `audit-and-fix` base `wyrdfold`→`develop`, `python-audit` drops dead `job-api`, deleted 2 stale one-off docs (research-407, wyrdfold-case-study), `git-workflow.md` branch base `main`→`develop`, removed dead `wyrdfold` case in run-spec-tests.sh. (Grounding: supabase-migration-reviewer's `wyrdfold_rename_pass.sql` refs are VALID — those migrations still live in forward-only history.)
