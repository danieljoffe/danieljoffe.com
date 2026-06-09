# Coding Conventions

## Rule of Three

When the same pattern appears 3+ times across files, extract it:

| Pattern             | Extract to                        | Example                                                 |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| UI element          | Kit component (`components/kit/`) | `Spinner`, `ErrorAlert`, `FormFieldError`, `Pagination` |
| className string    | Shared styles (`lib/`)            | `formStyles.ts`, `badgeStyles.ts`                       |
| Stateful logic      | Custom hook (`hooks/`)            | `useTableSort`                                          |
| Magic number/string | `utils/constants.ts`              | `FORM_LIMITS`, `VALIDATION_PATTERNS`                    |

Test abstractions that contain logic. Pure style extractions don't need tests.

## Component Patterns

- **Button**: Always use `@/components/Button` for buttons and button-styled links. The `name` prop is required by lint (except in `.stories.tsx`). Use `as='link'` with `href` for navigation that looks like a button.
- **Shared UI library**: Before creating a new component, check `libs/shared/ui/src/lib/` for an existing one. Prefer `@danieljoffe/shared-ui` components over building app-specific equivalents. If a shared-ui component is close but not quite right, extend it in the library rather than duplicating locally. Only promote an app-specific pattern to shared-ui when the Rule of Three applies (3+ usages across apps/libs). **Important**: `shared-ui` must only depend on React and Tailwind CSS — no Next.js APIs (`Link`, `useRouter`, `next/image`, etc.).
- **Shared UI ref pattern (React 19)**: Do **not** use `forwardRef` in shared-ui components. Instead, accept `ref` as a regular prop via `ref?: Ref<HTMLElement>` in the props interface and destructure it alongside other props. This is the React 19 pattern — `forwardRef` is deprecated. Components that are pure (no hooks/state) work in both server and client contexts without `'use client'`. Do not create `Client*` wrapper components in the app just to add a client boundary for ref compatibility — that pattern is obsolete.
- **Kit components (Next.js-specific)**: Components that depend on Next.js APIs (`Link`, `useRouter`, `next/image`, `usePathname`, etc.) live in `components/kit/` or `components/` within the app. Import kit components from `@/components/kit` barrel export, not individual files. New kit components must be added to `kit/index.ts`.
- **Toast notifications**: Use `useToast()` from `@/state/Toast/ToastProvider` for user feedback on async actions (success, error, network).
- **`global-error.tsx`**: Uses inline styles intentionally (renders outside the app tree where Tailwind isn't available). Don't convert to Tailwind.

## Styling

- Use `cn()` from `@/lib/cn` for conditional class merging (never `.join(' ')` with ternaries).
- Static multi-line class arrays using `.join(' ')` for readability are acceptable when there are no conditionals.
- Tailwind CSS 4 uses `@theme` directive and oklch color space — reference `styles/theme.css` for design tokens.

## Accessibility & Privacy

- Form inputs with validation errors must have `aria-describedby` pointing to the error element's `id`.
- Use `<FormFieldError message={error} id='field-error' />` for consistent error display.
- Add `data-sentry-mask` to all form inputs that collect PII (email, name, password).

## TypeScript

- `exactOptionalPropertyTypes` is enabled. When a prop can receive `undefined` from an expression (e.g., `errors?.name?.message`), declare it as `prop: string | undefined`, not `prop?: string`.
- Pre-commit hooks run lint-staged (ESLint + Prettier) then full typecheck. Both must pass.
