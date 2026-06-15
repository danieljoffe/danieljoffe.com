---
name: sharedui-smoketest
description: Persona-driven craftsmanship critique of the shared-ui Storybook at ui.danieljoffe.com — runs the design-systems, consuming-engineer, accessibility, and design lenses in parallel and synthesizes a unified report
disable-model-invocation: true
user-invocable: true
argument-hint: '[--only systems,consumer,a11y,design] [--url <storybook-url>]'
---

# Shared-UI Smoketest

A persona-driven critique of the deployed shared-ui component library
(Storybook) as an artifact of frontend craftsmanship. Spawns one subagent per
persona — each embodies a different expert reader, explores the live Storybook
in a browser, and returns an in-character verdict. The skill then synthesizes
all reports into one prioritized punch list.

This is the **craftsmanship counterpart** to `/visual-audit` (which reviews the
portfolio pages on localhost). It targets the published library, not localhost.

## Arguments

- `/sharedui-smoketest` — run all four personas.
- `/sharedui-smoketest --only a11y,design` — run a subset.
- `/sharedui-smoketest --skip consumer` — run all but the listed personas.
- `/sharedui-smoketest --url <url>` — override the target (default
  `https://ui.danieljoffe.com`; use a Vercel preview URL to critique a branch).

**Persona keys → files** (in `.claude/personas/`):

| Key        | Persona                  | File                          | Lens                                            |
| ---------- | ------------------------ | ----------------------------- | ----------------------------------------------- |
| `systems`  | Design Systems Engineer  | `design-systems-engineer.md`  | API consistency, composability, system cohesion |
| `consumer` | Consuming App Engineer   | `consuming-app-engineer.md`   | adoption / developer experience                 |
| `a11y`     | Accessibility Specialist | `accessibility-specialist.md` | WCAG 2.1 AA, keyboard, focus, ARIA              |
| `design`   | Design-Minded Reviewer   | `design-reviewer.md`          | visual craft, tokens, motion, cohesion          |

## Instructions

### Step 1: Resolve target and persona set

- `TARGET_URL` = `--url` value, else `https://ui.danieljoffe.com`.
- Determine the persona set from `--only` / `--skip` (default: all four).
- Do a quick reachability check on `TARGET_URL` (`gh`/curl HEAD or a single
  Playwright navigation). If it doesn't load, stop and tell the user — don't
  spawn agents against a dead URL.

### Step 2: Load persona definitions

For each selected persona, `Read` its file from `.claude/personas/`. Extract the
**"Persona (paste into the subagent prompt)"** and **"How to run (subagent
instructions)"** sections verbatim — those two sections are the agent's brief.

### Step 3: Spawn persona subagents SEQUENTIALLY (one at a time)

Launch one Agent per selected persona, `subagent_type: general-purpose` (they
need Playwright MCP browser access). Each agent prompt MUST contain:

1. The persona's two extracted sections, verbatim.
2. `TARGET_URL` to use (override the localhost references — this skill always
   targets the deployed/preview Storybook).
3. The persona's own **Return** contract (each file specifies one — keep it).
4. A reminder: DISCOVERY ONLY, no edits/commits; synthesize to prose; **no raw
   screenshots, snapshots, or console dumps in the returned report** (keep the
   browser noise in the subagent's context, not the main one).

> ⚠️ **Do NOT run the browser personas in parallel.** The Playwright MCP server
> exposes a **single shared browser context**. Multiple persona agents driving
> it at once navigate the same tab (each with its own `?nc=` cache-bust) and
> hijack each other — producing phantom findings like "the page auto-navigates
> every ~2s" and corrupting any multi-step keyboard/focus interaction. Run them
> **one at a time**: await each agent's result before launching the next. (If
> you truly need parallelism, give each agent an isolated browser context —
> until that's wired up, sequential is mandatory.)

Run the screenshot/interaction-heavy work inside the subagents so the main
context stays clean.

> 🔬 **Trust, but verify.** Persona findings are a starting signal, not ground
> truth — they can be stale (e.g. computed from README values that no longer
> match the shipped tokens) or contaminated (see the parallel-run warning
> above). Before filing or fixing anything, re-ground each finding against
> current source: read the component, compute the real contrast from the actual
> token, confirm the story/markup. Drop findings that don't survive grounding.

### Step 4: Synthesize the unified report

Collect the four verdicts. Deduplicate findings that multiple personas raise
about the same component/area (merge, noting which lenses flagged it — a finding
hit by 2+ personas is higher signal). Then output:

```markdown
## Shared-UI Smoketest — <TARGET_URL>

**Overall**: <one-line read on the library as a craftsmanship artifact>

| Lens                   | Verdict (in-persona, one line) |
| ---------------------- | ------------------------------ |
| Design Systems (Priya) | …                              |
| Consuming Eng (Diego)  | …                              |
| Accessibility (Sam)    | …                              |
| Design (Nadia)         | …                              |

### High — fix before showing this as a craft artifact

- [ ] <component/area> — <why> — <fix> _(lenses: …)_

### Medium

- [ ] <component/area> — <why> — <fix> _(lenses: …)_

### Low / polish

- [ ] <component/area> — <why> — <fix> _(lenses: …)_

### What worked (cross-persona)

- ✓ <strength>
```

Group by severity, not by persona. Keep accessibility findings' WCAG SC
citations intact when merging.

## Rules

- **Read-only.** No code edits, no commits — this is a critique, not a fix pass.
- Always target the deployed/preview Storybook, never localhost (that's
  `/visual-audit`'s job).
- One subagent per persona, run **sequentially** — never in parallel (they
  share one Playwright MCP browser; see Step 3).
- Persona findings are signal, not truth — re-ground each against current source
  before filing or fixing (see Step 3).
- Persona briefs are sourced from `.claude/personas/*.md` — if those files
  change, this skill picks up the change automatically. Do not inline/duplicate
  persona text into this skill.
- Skip any persona key not present in the personas directory and note it.
