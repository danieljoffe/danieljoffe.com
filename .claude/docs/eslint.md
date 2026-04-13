# ESLint

The workspace uses ESLint 10 with flat config (`apps/root/eslint.config.mjs`):

- **Custom rules**: `require-button-name` (enforces `name` prop on `<Button>`) and `no-raw-headings` (enforces heading components from kit instead of raw `<h1>`–`<h6>`)
- **Import ordering**: builtin → external → `@danieljoffe.com/*` → `@/*` → local (enforced by `import/order`)
- **Cycle detection**: `import/no-cycle` is enabled — circular imports are errors
- **Module boundaries**: `@nx/enforce-module-boundaries` restricts cross-project imports by project type/scope tags
