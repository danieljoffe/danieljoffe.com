---
name: nx-audit
description: Audit Nx monorepo structure and config against best practices
disable-model-invocation: true
---

# Nx Audit

Audit the Nx monorepo for structural and configuration issues against official Nx guidelines.

## Token Budget Rules

- Route ALL command outputs and workspace inspection results through `ctx_batch_execute` or `ctx_execute`
- If Nx docs were already fetched via context7 in this session, skip Phase 1
- Use Nx MCP tools for workspace queries — they're more efficient than raw CLI output

## Instructions

### Phase 1: Fetch Current Documentation

Use the context7 MCP server (`resolve-library-id` then `query-docs`) to fetch documentation for each audit area. Every finding MUST cite a specific doc section. Do not rely on memorized knowledge — the docs are the source of truth.

Resolve library: **Nx** (use `/websites/nx_dev`)

Query these topics (batch into 2-3 calls):

1. **Project configuration** — Crystal plugin inference, `package.json`-based vs `project.json`-based config, `nx.json` targetDefaults, namedInputs, task pipelines
2. **Caching & CI** — cache inputs/outputs, `sharedGlobals`, `production` namedInputs, Nx Cloud distributed caching, `nx affected`
3. **Module boundaries** — `enforce-module-boundaries`, project tags (scope/type/platform), dependency constraints, library types

### Phase 2: Inspect the Workspace

Use the Nx MCP server tools to inspect the workspace:

- List all projects and their tags/types
- Review project dependency graph for circular or unexpected dependencies
- Check target configurations and overrides
- Inspect `nx.json` for task pipeline, caching, and default settings
- Run `nx show project <name> --json` on key projects to check inferred vs explicit config

### Phase 3: Audit Areas

For each area below, read the relevant source files, compare against fetched docs, and report findings.

#### 3.1 Project Structure

- Projects missing proper tags (`scope`, `type`, `platform`)
- Libraries that should be split (too many concerns)
- Apps containing code that belongs in a library
- Unconventional directory layout (e.g., libs not under `libs/`)
- `project.json` vs `package.json`-based config — verify consistency with workspace conventions (Crystal plugin inference prefers `package.json` with `"nx"` field)

#### 3.2 Configuration & Caching

- `namedInputs` in `nx.json`: verify `default`, `production`, and `sharedGlobals` are defined and exclude test files from production inputs
- `targetDefaults`: check `build`, `test`, `lint` have correct `inputs`, `outputs`, `dependsOn`, and `cache` settings
- Targets that override plugin-inferred defaults unnecessarily (use `nx show project --json` and check `sourceMap` to distinguish inferred vs explicit)
- Missing `externalDependencies` inputs for targets that depend on specific tool versions (e.g., `vite`, `jest`, `eslint`)
- Cache outputs too broad (e.g., `{workspaceRoot}/dist` instead of `{projectRoot}/dist`) or too narrow

#### 3.3 Task Pipeline

- Missing `dependsOn: ["^build"]` for build targets in libraries consumed by other projects
- Test targets that should depend on build but don't
- Circular `dependsOn` chains
- Missing or incorrect `implicitDependencies`

#### 3.4 Module Boundaries

- Violations of `@nx/enforce-module-boundaries` rules
- Apps importing directly from other apps
- Shared libs depending on app-specific code
- Constraint rules in ESLint config that don't match actual project tags
- Circular dependency chains in the project graph

#### 3.5 Build & CI

- Projects not benefiting from Nx caching (missing `cache: true`)
- Targets that could use `nx affected` but don't
- Missing `namedInputs` for custom file patterns (e.g., MDX content files, Python sources)
- Remote cache configuration: verify `s3` block in nx.json (Cloudflare R2 via `@nx/s3-cache`), check `NX_KEY` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in CI env
- CI workflow efficiency: parallel task execution, remote caching hit rates

### Phase 4: Cross-Reference

Cross-reference findings with context7 documentation to confirm they are genuine violations, not acceptable patterns. Drop findings that the docs show are valid alternatives.

## Output Format

For each finding, report:

- **Location**: file path and relevant config key
- **Issue**: what violates Nx guidelines
- **Doc Reference**: specific Nx doc section that defines the best practice
- **Impact**: HIGH / MEDIUM / LOW
- **Recommendation**: specific, actionable fix with code/config example

Group findings by category (Structure, Configuration, Pipeline, Boundaries, Build & CI).

After all findings, include a summary table:

| Area | HIGH | MEDIUM | LOW |
| ---- | ---- | ------ | --- |
| ...  | ...  | ...    | ... |

If no issues are found in a category, state that explicitly.

End with "Next Steps" listing recommended follow-up actions in priority order.
