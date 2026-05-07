---
name: audit-and-fix
description: Run an audit skill, branch off the deploy target, apply HIGH-severity fixes, push, and open a PR
disable-model-invocation: true
user-invocable: true
---

# Audit and Fix

Orchestrates the post-audit workflow that recurs across `/security-review`, `/nx-audit`, `/nextjs-audit`, `/python-audit`, `/coverage-gaps --quality`, and `/supabase:supabase-postgres-best-practices`. Each of those skills produces findings; the boilerplate that follows is identical:

1. Branch off the canonical deploy target (`wyrdfold` for app/API/db work, `develop` otherwise)
2. Apply HIGH-severity fixes (and obvious mechanical MEDIUMs) inline via Edit
3. Run the affected test/lint/typecheck targets
4. Commit with a descriptive message that lists the findings
5. Push and `gh pr create --base <target>` with a generated body

This skill replaces ~6 manual commands per audit cycle.

## Arguments

- `/audit-and-fix <audit-name>` — run the audit and complete the loop. Audit name is the slash-command minus the leading `/` (e.g. `security-review`, `nx-audit`, `nextjs-audit`, `python-audit`, `coverage-gaps`, `supabase:supabase-postgres-best-practices`).
- `/audit-and-fix <audit-name> --base develop` — override the PR base (default: `wyrdfold` if migrations / `apps/wyrdfold` / `apps/wyrdfold-api` / `audit-api` are touched, else `develop`).
- `/audit-and-fix <audit-name> --branch <name>` — override the auto-derived branch name (default: `chore/<audit-name-slug>`).
- `/audit-and-fix <audit-name> --no-pr` — stop after push, don't open the PR.
- `/audit-and-fix <audit-name> --dry-run` — print the planned actions without writing or pushing.

## Instructions

### Step 1: Resolve target + branch

```bash
git fetch origin

# Determine deploy target. Default heuristic: if any of these paths
# show up in recent activity (or in the audit's expected scope), use
# `wyrdfold`; otherwise `develop`.
BASE=${ARG_BASE:-wyrdfold}
SLUG=$(echo "${AUDIT_NAME}" | tr ':/' '-' | tr -cd 'a-z0-9-')
BRANCH=${ARG_BRANCH:-chore/${SLUG}}
```

Branch off `origin/${BASE}`:

```bash
git checkout -b "${BRANCH}" "origin/${BASE}"
```

If the branch already exists locally, prompt the user: rebase onto `origin/${BASE}` or pick a new name.

### Step 2: Run the audit skill

Invoke the audit slash command directly. Capture findings into a working buffer. The audit skills all follow the same output shape:

- HIGH severity findings with `file:line` + fix recommendation
- MEDIUM findings (apply only when the fix is mechanical and self-contained)
- LOW / RECOMMENDATION findings (document, do not auto-fix)

If the audit is `coverage-gaps`, treat all `--quality` issues as candidates; for `--quality` invocations, append `--quality` to the audit call.

### Step 3: Apply HIGH fixes

For each HIGH finding:

1. Read the cited file (only if the fix isn't obvious from the diff hunk)
2. Apply the fix via Edit (single file) or Write (rare — only for net-new files like new migrations or shared modules)
3. After every batch of related fixes (≤4 files), run the affected test target. Stop early if a fix breaks something — investigate before proceeding.

Skip MEDIUM/LOW unless the audit explicitly flagged them as `mechanical safe fix`.

### Step 4: Verify

Run the relevant targets based on what changed:

```bash
# JS/TS edits
pnpm tsc --noEmit
pnpm nx test <project>             # for the touched project(s)
pnpm nx lint <project>

# Python edits
cd apps/<project>
uv run --package <project> ruff check .
uv run --package <project> mypy app/
uv run --package <project> pytest -q

# Supabase edits — no local apply; the Supabase Preview check on PR catches issues
```

Stop and report if anything fails — do **not** push a broken branch.

### Step 5: Commit + push + PR

Commit body should:

- Lead with a one-line summary that names the audit (e.g. `sec(audit): close 2 HIGH findings from /security-review`)
- List each finding as a bullet with `file:line` and a 1-sentence fix description
- End with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

```bash
git push -u origin "${BRANCH}"

gh pr create --base "${BASE}" --title "<derived from commit>" --body "$(generate-pr-body)"
```

PR body template:

```markdown
## Summary

<N> findings from `/<audit-name>` resolved in this PR.

## Fixed

- **<finding-id>** (HIGH/MEDIUM) `<file>:<line>` — <one-line fix description>

## Verification

- `pnpm tsc --noEmit`: clean
- `pnpm nx test <project>`: <N> pass
- ...

## Deferred

LOW/RECOMMENDATION findings from the audit not addressed in this PR. See the audit output above for the full list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### Step 6: Report back

Print:

- The PR URL
- Findings applied (count by severity)
- Findings deferred (count)
- Test results

## Constraints

- **Never** auto-merge the PR or force-push.
- **Never** edit a file outside the audit's scope. If a fix would touch unrelated code, surface it as a finding for the user instead.
- If the audit produces zero HIGH findings, exit with "no fixes needed" and do not branch or commit.
- If `--dry-run`, print every step without executing the mutating commands (`git checkout -b`, `git push`, `gh pr create`).
- If the user has staged or unstaged changes when starting, **abort** and tell them to commit/stash first — don't carry their work into the audit branch.

## Examples

```
/audit-and-fix security-review
→ branches chore/security-review off wyrdfold
→ runs /security-review
→ applies HIGH fixes
→ opens PR

/audit-and-fix supabase:supabase-postgres-best-practices --branch chore/db-rls-perf
→ same loop, custom branch name (good for narrowing scope when only one rule applies)

/audit-and-fix coverage-gaps --quality --no-pr
→ runs /coverage-gaps --quality
→ applies fixes, pushes, but skips PR creation
```
