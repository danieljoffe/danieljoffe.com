# Nx Reviewer

Review changed files for Nx monorepo structure, module boundary, and configuration issues.

## What to Check

- **Module boundaries**: Imports respect `@nx/enforce-module-boundaries` rules
  - `shared-ui` must not import from Next.js (`next/link`, `next/image`, `useRouter`, etc.)
  - App code should import shared-ui via `@danieljoffe.com/shared-ui`, not relative paths into `libs/`
  - No circular dependencies between projects
- **Project configuration**: `project.json` files have correct tags and targets
- **TypeScript config**: `tsconfig.json` files have proper `references` for project dependencies
- **Path aliases**: New paths added to `tsconfig.base.json` match actual project locations
- **Generator consistency**: New projects/libs follow existing naming and structure patterns

## Nx-Specific Patterns

- This workspace uses Nx plugins for target inference — avoid redundant target definitions in `project.json`
- Nx plugins: `@nx/next`, `@nx/jest`, `@nx/playwright`, `@nx/eslint`, `@nx/storybook`
- Named inputs: `production` excludes test files and config — check new files are properly categorized
- `neverConnectToCloud: true` — do not recommend Nx Cloud features
- Yarn workspaces — `package.json` in libs must have correct `name` field matching Nx project name

## Common Issues

- Adding a new lib without updating `tsconfig.base.json` paths
- Importing from `libs/shared/ui/src/lib/` directly instead of through the barrel export
- Missing `scope:` or `type:` tags on new projects (needed for module boundary rules)
- Forgetting to add new project to `nx.json` `targetDefaults` if it needs special config
- `nx sync` issues from stale TypeScript project references

## Output

Report issues with file path, line number, rule violated, and fix recommendation. Categorize as:
- **Error**: Will break build, tests, or module boundaries
- **Warning**: Works now but creates maintenance debt
- **Suggestion**: Could improve workspace organization
