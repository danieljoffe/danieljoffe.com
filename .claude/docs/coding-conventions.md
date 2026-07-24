# Coding Conventions

## Rule of Three

Same pattern 3+ times → extract: UI element → kit component (`components/kit/`); className strings → shared styles (`lib/`, e.g. `formStyles.ts`); stateful logic → hook (`hooks/`); magic values → `utils/constants.ts`. Test extractions that contain logic; pure style extractions don't need tests.

## Components

- **Button**: always `@/components/Button` for buttons and button-styled links; `name` prop required (lint); `as='link'` + `href` for navigation that looks like a button.
- **shared-ui first**: check `libs/shared/ui/src/lib/` before building anything new; extend close-but-not-quite components in the library rather than duplicating locally; promote app patterns only per Rule of Three. shared-ui depends on React + Tailwind only — no Next.js APIs.
- **Refs (React 19)**: no `forwardRef` — accept `ref` as a regular prop (`ref?: Ref<HTMLElement>`). Pure components work in server and client contexts without `'use client'`; don't create `Client*` wrappers.
- **Kit**: anything needing Next.js APIs (`Link`, `useRouter`, `next/image`, …) lives in `components/kit/`; import via the `@/components/kit` barrel and register new components in `kit/index.ts`.
- **Toasts**: `useToast()` from `@/state/Toast/ToastProvider` for async-action feedback. **`global-error.tsx`**: inline styles intentional (renders outside the app tree) — don't convert to Tailwind.

## Styling

`cn()` from `@/lib/cn` for conditional class merging — never ternary `.join(' ')`; static `.join(' ')` arrays are fine. Tailwind 4: `@theme` directive + oklch, tokens in `styles/theme.css`.

## A11y & Privacy

Inputs with validation errors get `aria-describedby` pointing at the error element's `id` (use `<FormFieldError message={error} id='…-error' />`). `data-sentry-mask` on every PII-collecting input.

## TypeScript

`exactOptionalPropertyTypes` is on: a prop receiving `undefined` from an expression (e.g. `errors?.name?.message`) is declared `prop: string | undefined`, not `prop?: string`.
