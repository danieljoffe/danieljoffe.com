# Shared-UI + Pyre Theme Readiness — Wyrdfold Migration

Issue: #593 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

`@danieljoffe.com/shared-ui` is **ready to consume from Wyrdfold as-is**.
The kit is product-agnostic, has no Next.js dependencies, ships 49
components with full test + Storybook coverage, and uses semantic
Tailwind 4 tokens that can be re-themed via CSS without touching
component code.

The Pyre theme (chartreuse on near-black) **does not yet exist** —
that is the only blocking work item for #593.

## 1. shared-ui inventory (49 components)

| Category | Components |
|---|---|
| Layout | `Container`, `Grid`, `GridBg`, `PageContainer`, `PageLayout`, `Section`, `Sidebar`, `Spacer`, `Stack` |
| Navigation | `Breadcrumb`, `Pagination`, `Tabs` |
| Inputs | `Button`, `Checkbox`, `Dropdown`, `FormFieldError`, `Input`, `Select`, `Switch`, `Textarea` |
| Feedback | `Alert`, `Loading`, `ProgressBar`, `Skeleton`, `Spinner`, `Toast` |
| Display | `AspectRatio`, `Avatar`, `Badge`, `Card`, `CTACard`, `Divider`, `Heading`, `Kbd`, `SectionLabel`, `StatsCard`, `Table`, `Text`, `Tooltip` |
| Modal | `Modal` |
| Theming | `ThemeProvider`, `ThemeToggle` |
| Infrastructure | `ErrorBoundary`, `StructuredData`, plus `styles/`, `utils/`, `types.ts` |

Every component ships with `.spec.tsx` (Vitest) and `.stories.tsx`
(Storybook). MDX docs exist for `Button`, `Card`, `Dropdown`, `Input`,
`Modal`, `Table`, `Tabs`, `Toast`.

## 2. Module-boundary cleanliness

**`peerDependencies`:**

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "tailwindcss": "^4.0.0",
  "lucide-react": ">=0.400.0"
}
```

`dependencies`: `clsx@2`, `tailwind-merge@3` only.

No `next/*`, no `@next/*`, no `forwardRef` — confirmed via grep. The
React 19 ref-as-prop pattern is in use. No `'use client'` is needed
for pure components; only `ThemeProvider`, `ThemeToggle`, and the
hook-bearing components that own state include it.

**Implication for Wyrdfold:** the lib drops in cleanly to any
React 19 + Tailwind 4 app, including a separate Wyrdfold app outside
this monorepo. If Wyrdfold ends up in a different repo, publish
shared-ui as `@danieljoffe.com/shared-ui` to npm or import directly
via git URL — no monorepo coupling exists.

## 3. Theme architecture

`apps/root/src/styles/theme.css` is the source of truth and uses
Tailwind 4's `@theme {}` directive with oklch colors:

```css
@theme {
  --radius-xs ... --radius-full
  --font-sans, --font-mono
  --shadow-xs ... --shadow-xl
  --color-brand-50 ... --color-brand-950   /* hue 250 (blue-indigo) */
  --color-surface, --color-surface-secondary, --color-surface-elevated
  --color-border, --color-border-secondary, --color-border-focus
  --color-text-primary, --color-text-secondary, --color-text-tertiary
  --color-success / -light, --color-warning / -light,
  --color-error / -light, --color-info / -light
}
```

Components consume these via Tailwind classes like `bg-brand-600`,
`text-text-primary`, `border-border`. **No component hardcodes brand
colors** — every visual surface goes through a token.

shared-ui ships an alternative `src/styles/indigo-theme.css` exported
at `@danieljoffe.com/shared-ui/styles/indigo-theme.css` for consumers
who don't have their own theme. apps/root doesn't use it — it has
its own `theme.css` with the same token names.

## 4. Pyre theme — the gap

Grep results for `pyre`, `chartreuse`, `--color-pyre`,
`fitted-theme`: **zero hits anywhere in the repo**.

The Pyre theme exists only as a project-decision concept ("chartreuse
on near-black") in conversation memory and wyrdfold-migration notes.
It needs to be authored.

### Recommended approach: a sibling `pyre-theme.css`

Create `libs/shared/ui/src/styles/pyre-theme.css` — same `@theme {}`
token names as `indigo-theme.css`, different palette. Wyrdfold imports
it once at the app root; every shared-ui component reskins
automatically because they consume tokens, not raw colors.

Skeleton:

```css
/* libs/shared/ui/src/styles/pyre-theme.css */
@theme {
  /* Pyre brand: chartreuse (oklch hue ~127, high chroma) */
  --color-brand-50:  oklch(0.97 0.05 127);
  --color-brand-100: oklch(0.93 0.10 127);
  --color-brand-200: oklch(0.87 0.16 127);
  --color-brand-300: oklch(0.78 0.22 127);
  --color-brand-400: oklch(0.72 0.26 127);
  --color-brand-500: oklch(0.67 0.28 127);  /* primary chartreuse */
  --color-brand-600: oklch(0.60 0.26 127);
  --color-brand-700: oklch(0.50 0.22 127);
  --color-brand-800: oklch(0.40 0.17 127);
  --color-brand-900: oklch(0.30 0.12 127);
  --color-brand-950: oklch(0.20 0.08 127);

  /* Surfaces — near-black */
  --color-surface:           oklch(0.10 0.01 270);  /* primary background */
  --color-surface-secondary: oklch(0.13 0.01 270);
  --color-surface-tertiary:  oklch(0.16 0.01 270);
  --color-surface-elevated:  oklch(0.13 0.01 270);
  --color-surface-overlay:   rgba(0, 0, 0, 0.6);

  /* Borders */
  --color-border:           oklch(0.22 0.01 270);
  --color-border-secondary: oklch(0.30 0.01 270);
  --color-border-focus:     oklch(0.67 0.28 127);  /* chartreuse focus ring */

  /* Text */
  --color-text-primary:   oklch(0.96 0.01 90);
  --color-text-secondary: oklch(0.75 0.02 90);
  --color-text-tertiary:  oklch(0.60 0.02 90);
  --color-text-inverse:   oklch(0.10 0.01 270);
  --color-text-brand:     oklch(0.78 0.22 127);

  /* Status — keep semantic hues, dim chroma for dark surface */
  --color-success: oklch(0.72 0.20 145);
  --color-warning: oklch(0.78 0.18 70);
  --color-error:   oklch(0.65 0.22 25);
  --color-info:    oklch(0.70 0.20 230);
}
```

Numbers above are placeholders — final values should be tuned
against actual chartreuse + near-black brand swatches and validated
for WCAG AA contrast (text on surface, focus ring on text, etc.).

### Do NOT extend `ThemeProvider`

`ThemeProvider` toggles a `dark` class for light/dark mode.
**Adding a `palette` prop would couple the React layer to Wyrdfold's
brand**, which violates the lib's "no product knowledge" rule. CSS
imports on the consumer side keep all branding in the consumer.

### Wyrdfold light/dark behavior

Pyre is intrinsically a dark theme (chartreuse-on-near-black).
Wyrdfold can ship Pyre as the `:root` palette and skip the
`html.dark` override entirely (delete the dark block from
pyre-theme.css). Or define a "Pyre Bright" daytime variant later if
the brand matures. For #593 readiness, Pyre-only is fine.

## 5. Sidebar reuse

`libs/shared/ui/src/lib/Sidebar.tsx` exists and is fully tested. The
Fitted app currently rolls its own at
`apps/root/src/app/fitted/(app)/FittedSidebar.tsx` — the rename
inventory in #589 already flags this for the Wyrdfold migration.

**Recommendation for Wyrdfold:** use the shared-ui `<Sidebar>`
directly with Wyrdfold-specific nav items. Leave audit-tool's
`FittedSidebar.tsx` alone (it'll move to Wyrdfold-app and convert
in the same change).

## 6. Storybook + tests

- Vitest setup at `libs/shared/ui/.storybook/vitest.setup.ts`
- Storybook config at `libs/shared/ui/.storybook/{main,manager,preview-head}.ts`
- jest-axe runs against every `.spec.tsx` (a11y baseline)
- `/storybook-check` and `/verify-sharedui` skills exercise the lib

For Wyrdfold-readiness specifically:
- Add Pyre theme stories — render a representative subset of components
  (Button, Card, Modal, StatsCard, Sidebar) in a Pyre-themed Storybook
  story so the theme can be validated visually before Wyrdfold consumes
  it.
- Run jest-axe with the Pyre palette to verify contrast doesn't break
  WCAG AA. Tailwind 4 oklch contrast is sensitive at `0.65` lightness
  with high chroma — likely fine for chartreuse on near-black, but
  verify.

## 7. /fitted-coupled patterns to NOT promote

These live in apps/root and should NOT migrate into shared-ui:
- `FittedSidebar.tsx` — has Fitted-specific nav items
- `_components/ConversationChat*.tsx` — career-decision-tool–specific
- `(app)/insights/charts/*` — Fitted insights visualizations (move
  with Wyrdfold, not into shared-ui)
- `(app)/targets/CreateTargetModal.tsx`, `PendingTargetCard.tsx`,
  `TargetsList.tsx` — target-domain UI

These are correctly product-specific and don't violate the kit boundary.

## 8. Open questions for the migration

1. **Where does Wyrdfold live?** Same monorepo (`apps/wyrdfold/`) or a
   separate repo? Same monorepo = direct path-alias import; separate
   repo = published npm package or git submodule. Sharing the lib
   works either way; this affects packaging only.
2. **Pyre brand spec.** The chartreuse value, near-black surface
   value, and accent hues need final tuning. Recommend a Figma file
   (or quick Tailwind playground) before committing the css.
3. **Light variant?** Pyre as dark-only for v1 keeps scope tight.
4. **Brand asset path.** Wyrdfold logo / favicon / OG image are out
   of scope for this audit — they live in `apps/wyrdfold/public/`
   when that app is scaffolded.

## 9. Decision summary

| Question | Answer |
|---|---|
| Is shared-ui safe to share with Wyrdfold? | **Yes**, no changes needed. |
| Where do Pyre tokens live? | New file `libs/shared/ui/src/styles/pyre-theme.css`, exported via package `exports` map. |
| Do components need re-skinning? | **No** — token-based theming reskins everything via CSS. |
| Does ThemeProvider need extending? | **No** — palette comes from CSS, not React state. |
| Is `Sidebar` reusable for Wyrdfold? | **Yes** — replace `FittedSidebar` with shared-ui `Sidebar` + Wyrdfold-specific nav items. |
| What's the only blocker for #593? | Author `pyre-theme.css` and validate WCAG contrast. |

## 10. Ready-to-do checklist for the migration commit (separate PR)

- [ ] Create `libs/shared/ui/src/styles/pyre-theme.css` with final
      chartreuse + near-black token values
- [ ] Add `"./styles/pyre-theme.css": "./src/styles/pyre-theme.css"`
      to `libs/shared/ui/package.json` `exports`
- [ ] Add a Storybook decorator for Pyre theme so stories can be
      previewed in either palette
- [ ] Run `pnpm nx test shared-ui` (jest-axe) under Pyre to confirm
      contrast
- [ ] Verify build with `pnpm nx build shared-ui` and a consumer
      smoke test (the `/verify-sharedui` skill covers this)

## 11. Out of scope

- Pyre logo / brand assets (Wyrdfold-app concern, not shared-ui)
- Theme switcher UI for Wyrdfold (Pyre-only v1)
- Migration of the Fitted Sidebar to shared-ui's Sidebar (happens with
  the Wyrdfold app scaffold, not here)

## 12. Collisions

None. The other session is editing `apps/job-api/` exclusively — no
overlap with `libs/shared/ui/`.
