---
name: nx-audit
description: Audit Nx monorepo structure and config against best practices
disable-model-invocation: true
---

# Nx Audit

Audit the Nx monorepo for structural and configuration issues against official Nx guidelines.

## Instructions

1. Use the context7 MCP server to resolve and fetch current Nx documentation for:
   - Monorepo project structure and conventions
   - `project.json` / `package.json`-based configuration
   - Plugin inference and target defaults
   - Dependency management between projects
   - Caching and task pipeline configuration (`nx.json`)
   - Generator and migration best practices

2. Use the Nx MCP server tools to inspect the workspace:
   - List all projects and their tags/types
   - Review project dependency graph for circular or unexpected dependencies
   - Check target configurations and overrides
   - Inspect `nx.json` for task pipeline, caching, and default settings

3. Review the workspace against Nx guidelines, flagging:

   **Project Structure**
   - Projects missing proper tags (scope, type, platform)
   - Libraries that should be split (too many concerns)
   - Apps containing code that belongs in a library
   - Missing or misconfigured `project.json` / `package.json` project roots
   - Unconventional directory layout (e.g., libs not under `libs/`)

   **Configuration**
   - Targets that override plugin-inferred defaults unnecessarily
   - Missing or incorrect `implicitDependencies`
   - Task pipelines with missing or incorrect `dependsOn` chains
   - Cache inputs/outputs that are too broad or too narrow
   - Generators not using recommended presets or options

   **Dependency Rules**
   - Violations of module boundary rules (enforce-module-boundaries)
   - Apps importing directly from other apps
   - Shared libs depending on app-specific code
   - Circular dependency chains

   **Build & CI**
   - Projects not benefiting from Nx caching
   - Targets that could use `nx affected` but don't
   - Missing `namedInputs` for custom file patterns
   - Build artifacts not properly configured for caching

4. Cross-reference findings with context7 documentation to confirm they are genuine violations, not acceptable patterns.

## Output

For each finding, report:

- **Location**: file path and relevant config key
- **Issue**: what violates Nx guidelines
- **Guideline**: link or reference to the Nx doc that defines the best practice
- **Impact**: HIGH / MEDIUM / LOW
- **Recommendation**: specific, actionable fix with code/config example

Group findings by category (Structure, Configuration, Dependencies, Build & CI).

If no issues are found in a category, state that explicitly.
