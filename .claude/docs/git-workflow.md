# Git Workflow

## Branching Strategy

- **`develop`** is the default base branch for all PRs. Feature branches merge into `develop`.
- **`main`** is the production branch. Only `develop` can be merged into `main`.
- Never open a PR targeting `main` directly from a feature branch.
- Create a new branch per issue: `feature/<feature-name>` from `main`.
- **Keep `develop` in sync with `main`**: Before creating or updating a PR targeting `develop`, check if `develop` is behind `main` (`git log develop..main --oneline`). If it is, merge `main` into `develop` and push. Flag any merge conflicts for the user instead of auto-resolving.

## Pre-Push Checklist

Before pushing any changes, **always** run the full unit test suite and typecheck:

```bash
pnpm tsc --noEmit         # Must have zero errors
pnpm nx test root         # All tests must pass
```

Do not push if either command fails. Fix the issue first.
