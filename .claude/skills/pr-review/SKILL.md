---
name: pr-review
description: Run reviewer agents on changed files with smart filtering, manifest-based routing, and diff-first analysis
disable-model-invocation: true
user-invocable: true
---

# PR Review

Context-efficient review of the current branch's changed files. Builds a file manifest, filters out noise, and routes only relevant files to each reviewer agent.

## Arguments

- `/pr-review` — review all changed files (auto-detects base branch)
- `/pr-review --only a11y,perf` — run only specified reviewers
- `/pr-review --skip content,nx` — skip specified reviewers
- `/pr-review --base main` — override base branch (default: auto-detect)
- `/pr-review --force` — bypass PR size guardrails

Reviewer names: `a11y`, `perf`, `content`, `nx`, `e2e`, `security`

## Token Budget Rules

- Build the manifest via `ctx_batch_execute` — diffs can be large
- Pass diff hunks to agents in the prompt — agents only read full files when hunks lack context
- Agents must use `ctx_batch_execute` for any file reads >50 lines

## Instructions

### Step 1: Detect base branch

```bash
gh pr view --json baseRefName --jq '.baseRefName' 2>/dev/null || echo "develop"
```

Use the result as `BASE_BRANCH`. Override with `--base` if provided. Always `git fetch origin` first.

### Step 2: Build file manifest

Run via `ctx_batch_execute`:

```bash
git diff --name-status origin/${BASE_BRANCH}...HEAD
git diff --stat origin/${BASE_BRANCH}...HEAD
```

Parse into a structured manifest. For each file determine:

| Field             | Values                                                    |
| ----------------- | --------------------------------------------------------- |
| **status**        | `A` (added), `M` (modified), `D` (deleted), `R` (renamed) |
| **lines_changed** | additions + deletions from `--stat`                       |
| **category**      | See classification table below                            |

**File classification:**

| Pattern                                                                  | Category      |
| ------------------------------------------------------------------------ | ------------- |
| Status `D` (any path)                                                    | `deleted`     |
| `*.png`, `*.jpg`, `*.svg`, `*.ico`, `*-snapshots/*`                      | `binary`      |
| `.claude/`, `CLAUDE.md`                                                  | `skill-meta`  |
| `*.md` (not `.claude/`, not `.mdx`)                                      | `docs`        |
| `*.mdx` in `data/content/`                                               | `content-mdx` |
| `apps/root-e2e/**`                                                       | `e2e-test`    |
| `*.spec.*`, `*.test.*`, `__tests__/*`, `__mocks__/*`                     | `unit-test`   |
| `project.json`, `tsconfig*`, `nx.json`, `eslint.config*`, `package.json` | `config`      |
| `apps/root/src/app/api/**`, `*/middleware.ts`, `*/proxy.ts`              | `api-code`    |
| `libs/**` (non-test)                                                     | `lib-code`    |
| `apps/**` (non-test, non-api)                                            | `app-code`    |

### Step 3: Apply guardrails

Count **reviewable files** = total minus `deleted`, `binary`, `skill-meta`, `docs`.
Sum **reviewable lines** = `lines_changed` across the same set.

| Reviewable files | Reviewable lines | Action                                                                        |
| ---------------- | ---------------- | ----------------------------------------------------------------------------- |
| 0                | any              | Report clean — nothing to review. Stop.                                       |
| 1–30             | ≤ 400            | Proceed normally.                                                             |
| 1–30             | 401–1500         | Warn the user about PR size. Suggest splitting. Proceed.                      |
| 31–80            | ≤ 1500           | Warn the user. Suggest `--only` for focused review. Proceed.                  |
| 31–80            | > 1500           | **Refuse** unless `--force`. Suggest splitting or `--only`.                   |
| > 80             | any              | **Refuse** unless `--force`. Print the manifest summary and suggest `--only`. |

The LOC threshold catches the 5-file / 2000-line refactor that slips past a pure file-count check. ~400 LOC is the reviewer-attention upper bound for a single PR — beyond it, real bugs hide in volume and findings get less specific.

### Step 4: Route files to reviewers

Each reviewer gets ONLY its relevant files from the manifest:

| Reviewer     | Receives categories                                               | File filter            |
| ------------ | ----------------------------------------------------------------- | ---------------------- |
| **a11y**     | `app-code`, `lib-code`                                            | `.tsx` files only      |
| **perf**     | `app-code`, `lib-code`, `api-code`                                | `.ts` and `.tsx` files |
| **content**  | `content-mdx`                                                     | all                    |
| **nx**       | `config`                                                          | all                    |
| **e2e**      | `e2e-test`                                                        | all                    |
| **security** | `api-code`, plus `app-code`/`lib-code` touching auth, env, Resend | `.ts` and `.tsx` files |

**Routing rules:**

- Skip any reviewer with 0 matching files.
- Respect `--only` / `--skip` flags after routing.
- `unit-test` files are NOT sent to a11y, perf, content, or security reviewers. Only e2e-reviewer receives test files (for coverage gap analysis — it compares test files against routes).

### Step 5: Prepare agent context

For each file in an agent's queue, prepare the diff hunk:

```bash
git diff origin/${BASE_BRANCH}...HEAD -- <file>
```

Run all file diffs in a single `ctx_batch_execute` call, then search for each file's hunk.

**Per-file treatment based on change size:**

| Lines changed | Agent receives     | Agent action                                        |
| ------------- | ------------------ | --------------------------------------------------- |
| Deleted       | Manifest note only | Note gap/impact, do NOT read                        |
| < 10 lines    | Diff hunk only     | Review hunk in isolation                            |
| 10–100 lines  | Diff hunk          | Read full file only if hunk context is insufficient |
| > 100 lines   | Diff hunk          | Read full file via `ctx_batch_execute`              |

**File budget:** Cap at **15 files per agent**. If a reviewer's queue exceeds 15, prioritize by `lines_changed` (largest first). Note skipped files in the report.

### Step 6: Select agent model

| Reviewer             | Matching files | Model                                      |
| -------------------- | -------------- | ------------------------------------------ |
| Any                  | > 10 files     | `sonnet` (faster throughput)               |
| content, nx          | any count      | `sonnet` (checklist-driven, deterministic) |
| a11y, perf, security | ≤ 10 files     | default (inherits parent model)            |
| e2e                  | any count      | `sonnet`                                   |

Override: when `--force` is used, all agents inherit the parent model.

### Step 7: Launch agents in parallel

Spawn each applicable reviewer via the Agent tool with `subagent_type` matching the reviewer name (e.g., `a11y-reviewer`). Include in each agent's prompt:

1. **Manifest summary**: branch, base, total files, reviewable count
2. **This agent's file list** with diff hunks inline
3. **Instruction**: "Review ONLY the listed files. For files marked diff-only, review the hunk. Read full files via `ctx_batch_execute` only when the diff lacks sufficient context for your checklist."

### Step 8: Collect and deduplicate

Merge findings from all agents. Deduplicate by `file:line` — if multiple agents flag the same location, merge into one finding noting all reviewers.

### Step 9: Output unified report

Lead with a one-line **Verdict** that says, at a glance, whether the PR is mergeable. The verdict is derived deterministically from the finding counts (see the table below) — don't editorialise.

```markdown
## PR Review Summary

**Verdict**: <BLOCK | NEEDS-ACK | READY> — <one-sentence reason>

**Branch**: <branch> → <base>
**Files in PR**: <total> | **Reviewed**: <count> | **Skipped**: <count> (deleted/binary/meta/docs)
**Reviewers run**: <list>
**Skipped reviewers**: <list with reason>

### Critical (must fix — blocks merge)

- [ ] file:line — description (reviewer)

### Warnings (should fix — explicit ack required)

- [ ] file:line — description (reviewer)

### Suggestions (nice to have — advisory)

- [ ] file:line — description (reviewer)

### Passed Checks

- ✓ description (reviewer)

### Skipped Files

<count> files not reviewed: <breakdown by reason>
```

**Verdict derivation table:**

| Critical | Warnings | Verdict     | Meaning                                                                                 |
| -------- | -------- | ----------- | --------------------------------------------------------------------------------------- |
| ≥ 1      | any      | `BLOCK`     | Merge blocked. Critical findings must be resolved (or downgraded with rationale) first. |
| 0        | ≥ 1      | `NEEDS-ACK` | User must explicitly acknowledge each warning before merging (a "ship it anyway" call). |
| 0        | 0        | `READY`     | Mergeable. Suggestions are advisory and do not gate.                                    |

The verdict is informational — the skill does not block any git operation. It's a clear signal so the user (or a downstream merge-gate workflow) can act without re-reading the whole report.

**Downgrading a Critical to a Warning** is allowed when the user provides a written rationale (e.g. "false positive — this path is api-key only, not user-reachable"). Note the downgrade inline next to the finding.

## Rules

- Read-only analysis — no code changes.
- Group findings by severity, not by reviewer.
- Deleted files are noted but never read.
- Binary and snapshot files are always skipped.
- Test files route to e2e-reviewer only.
- Skill/meta files (`.claude/`) are always skipped.
- Read-only — the skill writes no files (findings go to the report only).
