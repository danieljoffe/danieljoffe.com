# Self-Healing Configuration

## Confidence Rules

- Fixes involving "test" targets should require high confidence
- Formatting fixes can be applied with medium confidence

## Off-Limits Areas

- `apps/root/src/data/generated/` - auto-generated content registry, do not modify (regenerate via the content scripts)
- `dist/`, `.next/`, `out-tsc/` - build output

## Fix Preferences

- Prefer updating ESLint rules over adding disable comments
- For type errors, prefer explicit types over `any`

## Context

See `.claude/docs/architecture.md` for module boundaries.
