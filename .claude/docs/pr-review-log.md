# PR Review Audit Log

Append-only log of `/pr-review` runs and their dispositions. Used to spot recurring false positives and tune reviewer prompts over time.

## Entry shape

```markdown
- `YYYY-MM-DD` PR#<number> · <branch> · <verdict> · C:<n> W:<n> S:<n> · <reviewers run> · <one-sentence summary>
  → Disposition: <action>
```

`<verdict>` is one of `BLOCK`, `NEEDS-ACK`, `READY` (see `.claude/skills/pr-review/SKILL.md`).
`<action>` is added on the turn after the PR is dispositioned: `merged-as-is`, `merged-with-followup`, `closed-without-merge`, or `findings-overruled: <reason>`.

## Log

<!-- Newest entries at the bottom. Do not rewrite past entries except to add the disposition suffix. -->
