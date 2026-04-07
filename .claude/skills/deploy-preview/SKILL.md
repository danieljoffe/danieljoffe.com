---
name: deploy-preview
description: Push current branch and retrieve the Vercel preview deployment URL
disable-model-invocation: true
user-invocable: true
---

# Deploy Preview

Push the current branch to origin and retrieve the Vercel preview deployment URL.

## Arguments

`/deploy-preview` — no arguments needed (uses current branch)

## Instructions

1. **Verify branch state:**

   ```bash
   git status
   ```

   - If there are uncommitted changes, warn the user and stop.
   - If the branch is `main` or `develop`, warn and stop — previews are for feature branches.

2. **Push to origin:**

   ```bash
   git push -u origin HEAD
   ```

3. **Wait for Vercel deployment to start:**
   - Use `gh` CLI to check for deployment status:
     ```bash
     gh api repos/{owner}/{repo}/deployments --jq '.[0] | {environment, state, url: .payload.web_url // .environment_url}'
     ```
   - Or check the latest commit status/checks:
     ```bash
     gh pr checks HEAD --watch --fail-fast 2>/dev/null || gh run list --branch $(git branch --show-current) --limit 1
     ```

4. **Report the preview URL** to the user, along with:
   - Branch name
   - Commit SHA (short)
   - Deployment status (pending/building/ready)

5. If no Vercel integration is detected, suggest the user run `npx vercel` manually.

## Rules

- Never force push.
- Do not create a PR — this is just for getting a preview URL.
- If push fails (e.g., branch protection), report the error clearly.
