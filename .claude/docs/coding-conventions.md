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
- **Shared UI library**: Check `libs/shared/ui/src/lib/` before building a new component; prefer `@danieljoffe/shared-ui` over app-specific equivalents. Extend close-but-not-quite components in the library rather than duplicating locally; promote app patterns to shared-ui only per the Rule of Three. shared-ui depends only on React + Tailwind — no Next.js APIs (`Link`, `useRouter`, `next/image`, etc.).
- **Refs (React 19)**: No `forwardRef` in shared-ui — accept `ref` as a regular prop (`ref?: Ref<HTMLElement>`). Pure components (no hooks/state) work in server and client contexts without `'use client'`; don't create `Client*` wrappers in the app just to add a client boundary — that pattern is obsolete.
- **Kit components**: Anything depending on Next.js APIs (`Link`, `useRouter`, `next/image`, `usePathname`, etc.) lives in `components/kit/` or `components/` within the app. Import from the `@/components/kit` barrel, not individual files; new kit components must be added to `kit/index.ts`.
- **Toasts**: Use `useToast()` from `@/state/Toast/ToastProvider` for user feedback on async actions.
- **`global-error.tsx`**: Inline styles are intentional (renders outside the app tree where Tailwind isn't available). Don't convert to Tailwind.

## Styling

- Use `cn()` from `@/lib/cn` for conditional class merging (never `.join(' ')` with ternaries). Static multi-line `.join(' ')` arrays are fine when there are no conditionals.
- Tailwind CSS 4 uses `@theme` directive and oklch color space — design tokens in `styles/theme.css`.

## Accessibility & Privacy

- Form inputs with validation errors must have `aria-describedby` pointing to the error element's `id`; use `<FormFieldError message={error} id='field-error' />` for consistent display.
- Add `data-sentry-mask` to all form inputs that collect PII (email, name, password).

## TypeScript

- `exactOptionalPropertyTypes` is enabled. When a prop can receive `undefined` from an expression (e.g., `errors?.name?.message`), declare it as `prop: string | undefined`, not `prop?: string`.
- Pre-commit hooks run lint-staged (ESLint + Prettier) then full typecheck. Both must pass.
