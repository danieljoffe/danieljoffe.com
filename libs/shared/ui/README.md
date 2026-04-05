# @danieljoffe.com/shared-ui

A React component library built with Tailwind CSS 4. Provides 40+ accessible, theme-aware UI primitives designed for the danieljoffe.com ecosystem.

**Live component catalog**: [ui.danieljoffe.com](https://ui.danieljoffe.com) (Storybook)

## Installation

```bash
npm install @danieljoffe.com/shared-ui
```

### Peer dependencies

| Package             | Version    | Required                            |
| ------------------- | ---------- | ----------------------------------- |
| `react`             | `^19.0.0`  | Yes                                 |
| `react-dom`         | `^19.0.0`  | Yes                                 |
| `tailwindcss`       | `^4.0.0`   | Yes                                 |
| `@headlessui/react` | `^2.0.0`   | Yes (Dropdown, Modal, Tabs, Select) |
| `lucide-react`      | `^0.460.0` | Yes (icons in various components)   |

```bash
npm install react react-dom tailwindcss @headlessui/react lucide-react
```

## Quick start

```tsx
import { Button } from '@danieljoffe.com/shared-ui';
// Or use deep imports for tree-shaking:
import { Button } from '@danieljoffe.com/shared-ui/Button';

export default function App() {
  return (
    <Button variant='primary' size='md'>
      Get Started
    </Button>
  );
}
```

## Theme setup

Import the theme CSS to get design tokens (colors, spacing, typography, shadows, animations):

```css
/* In your global CSS or Tailwind entry point */
@import '@danieljoffe.com/shared-ui/styles/theme.css';
```

The theme file is **self-contained** with no external imports. It uses Tailwind CSS 4's `@theme` directive so every token is available as both a CSS custom property and a Tailwind utility class (e.g., `bg-brand-500`, `text-text-secondary`, `shadow-md`).

> **oklch color space** -- Brand colors use `oklch()` for perceptually uniform lightness across the scale. Semantic surface/text/status colors use hex or `rgba` for maximum browser compatibility.

### Consumer setup (Tailwind CSS 4)

```css
/* app/globals.css */
@import 'tailwindcss';
@import '@danieljoffe.com/shared-ui/styles/theme.css';
```

That single import gives you every token below. No `tailwind.config` changes are needed in Tailwind CSS 4 -- the `@theme` directive registers tokens automatically.

### Integration paths

| Approach               | When to use                        | How                                                                                                                                            |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full adoption**      | New apps built on shared-ui        | Import `theme.css` as shown above. All tokens, base styles, dark mode, and keyframes are active.                                               |
| **Selective adoption** | Existing apps with their own theme | Copy individual `@theme` token groups into your own CSS. Or import `theme.css` and override specific variables in a subsequent `@theme` block. |

To override tokens selectively:

```css
@import '@danieljoffe.com/shared-ui/styles/theme.css';

@theme {
  --color-brand-500: oklch(0.6 0.2 280); /* shift brand toward purple */
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
}
```

### Full token reference

#### Radius

| Token           | Value      | Tailwind class |
| --------------- | ---------- | -------------- |
| `--radius-sm`   | `0.375rem` | `rounded-sm`   |
| `--radius-md`   | `0.5rem`   | `rounded-md`   |
| `--radius-lg`   | `0.75rem`  | `rounded-lg`   |
| `--radius-xl`   | `1rem`     | `rounded-xl`   |
| `--radius-full` | `9999px`   | `rounded-full` |

#### Typography

| Token         | Value                                           | Tailwind class |
| ------------- | ----------------------------------------------- | -------------- |
| `--font-sans` | `'Inter', ui-sans-serif, system-ui, sans-serif` | `font-sans`    |
| `--font-mono` | `'JetBrains Mono', ui-monospace, monospace`     | `font-mono`    |

#### Shadows

| Token         | Light mode                                                            | Dark mode                                                           | Tailwind class |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------- |
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)`                                          | `0 1px 2px rgba(0,0,0,0.2)`                                         | `shadow-xs`    |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`              | `0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)`              | `shadow-sm`    |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)`    | `0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)`    | `shadow-md`    |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)`  | `0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.2)`  | `shadow-lg`    |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)` | `0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.2)` | `shadow-xl`    |

#### Animations

| Token                  | Value                       | Tailwind class       |
| ---------------------- | --------------------------- | -------------------- |
| `--animate-fade-in`    | `fade-in 0.2s ease-out`     | `animate-fade-in`    |
| `--animate-slide-up`   | `slide-up 0.2s ease-out`    | `animate-slide-up`   |
| `--animate-slide-down` | `slide-down 0.15s ease-out` | `animate-slide-down` |
| `--animate-scale-in`   | `scale-in 0.15s ease-out`   | `animate-scale-in`   |

Additional keyframes defined (usable in custom animations): `bounceSubtle`, `pulseSlow`.

#### Colors -- Brand (blue-indigo, oklch hue 250)

| Token               | Value                  | Tailwind class                       |
| ------------------- | ---------------------- | ------------------------------------ |
| `--color-brand-50`  | `oklch(0.97 0.01 250)` | `bg-brand-50`, `text-brand-50`, etc. |
| `--color-brand-100` | `oklch(0.93 0.03 250)` | `bg-brand-100`                       |
| `--color-brand-200` | `oklch(0.87 0.06 250)` | `bg-brand-200`                       |
| `--color-brand-300` | `oklch(0.78 0.1 250)`  | `bg-brand-300`                       |
| `--color-brand-400` | `oklch(0.68 0.15 250)` | `bg-brand-400`                       |
| `--color-brand-500` | `oklch(0.54 0.19 250)` | `bg-brand-500`                       |
| `--color-brand-600` | `oklch(0.5 0.19 250)`  | `bg-brand-600`                       |
| `--color-brand-700` | `oklch(0.43 0.17 250)` | `bg-brand-700`                       |
| `--color-brand-800` | `oklch(0.37 0.14 250)` | `bg-brand-800`                       |
| `--color-brand-900` | `oklch(0.3 0.1 250)`   | `bg-brand-900`                       |
| `--color-brand-950` | `oklch(0.22 0.08 250)` | `bg-brand-950`                       |

#### Colors -- Semantic surface

| Token                       | Light             | Dark              | Tailwind class         |
| --------------------------- | ----------------- | ----------------- | ---------------------- |
| `--color-surface`           | `#ffffff`         | `#0f1117`         | `bg-surface`           |
| `--color-surface-secondary` | `#f9fafb`         | `#161922`         | `bg-surface-secondary` |
| `--color-surface-tertiary`  | `#f3f4f6`         | `#1e2130`         | `bg-surface-tertiary`  |
| `--color-surface-elevated`  | `#ffffff`         | `#1a1d2b`         | `bg-surface-elevated`  |
| `--color-surface-overlay`   | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | `bg-surface-overlay`   |

#### Colors -- Semantic border

| Token                      | Light                  | Dark      | Tailwind class            |
| -------------------------- | ---------------------- | --------- | ------------------------- |
| `--color-border`           | `#e5e7eb`              | `#2a2d3a` | `border-border`           |
| `--color-border-secondary` | `#d1d5db`              | `#3a3d4a` | `border-border-secondary` |
| `--color-border-focus`     | `oklch(0.54 0.19 250)` | _(same)_  | `outline-border-focus`    |

#### Colors -- Semantic text

| Token                    | Light                 | Dark      | Tailwind class        |
| ------------------------ | --------------------- | --------- | --------------------- |
| `--color-text-primary`   | `#111827`             | `#f1f5f9` | `text-text-primary`   |
| `--color-text-secondary` | `#6b7280`             | `#94a3b8` | `text-text-secondary` |
| `--color-text-tertiary`  | `#9ca3af`             | `#64748b` | `text-text-tertiary`  |
| `--color-text-inverse`   | `#ffffff`             | `#0f1117` | `text-text-inverse`   |
| `--color-text-brand`     | `oklch(0.5 0.19 250)` | _(same)_  | `text-text-brand`     |

#### Colors -- Status

| Token                   | Light     | Dark      | Tailwind class               |
| ----------------------- | --------- | --------- | ---------------------------- |
| `--color-success`       | `#10b981` | _(same)_  | `text-success`, `bg-success` |
| `--color-success-light` | `#ecfdf5` | `#052e16` | `bg-success-light`           |
| `--color-warning`       | `#f59e0b` | _(same)_  | `text-warning`, `bg-warning` |
| `--color-warning-light` | `#fffbeb` | `#451a03` | `bg-warning-light`           |
| `--color-error`         | `#ef4444` | _(same)_  | `text-error`, `bg-error`     |
| `--color-error-light`   | `#fef2f2` | `#450a0a` | `bg-error-light`             |
| `--color-info`          | `#2563eb` | _(same)_  | `text-info`, `bg-info`       |
| `--color-info-light`    | `#eff6ff` | `#172554` | `bg-info-light`              |

### Dark mode

Dark mode is handled via `.dark` class overrides in the same theme file. The `ThemeProvider` component toggles the `.dark` class on `<html>`. The theme file also registers a custom variant:

```css
@custom-variant dark (&:is(.dark *));
```

This means you can use `dark:` prefix in Tailwind classes (e.g., `dark:bg-surface-secondary`) and they will activate when `.dark` is present on an ancestor element.

### Base styles

The theme file includes an `@layer base` block that sets:

- Default border and outline colors on all elements
- Body background, text color, font-family, and line-height
- Heading typography (h1-h6) with balanced text wrapping and tight letter-spacing
- Code element styling using `font-mono` with brand-colored background
- Table and list resets
- Scrollbar styling (WebKit)
- `prefers-reduced-motion` support (disables animations automatically)

### Experimental color schemes

The `styles/` directory also contains three SCSS-based color scheme variants. These are **experimental** and use a different variable convention from the main `theme.css` (e.g., `--accent`, `--background` instead of `--color-brand-*`, `--color-surface`). They are not currently exported in `package.json` and are not intended for consumer use:

| Scheme       | Directory              | Accent color |
| ------------ | ---------------------- | ------------ |
| Deep Teal    | `styles/deep-teal/`    | `#0d7377`    |
| Muted Violet | `styles/muted-violet/` | `#6b5b95`    |
| Warm Gold    | `styles/warm-gold/`    | `#9a6c18`    |

Each includes a `default.scss` (light) and `dark.scss` file.

## Component catalog

### Typography

| Component   | Description                                | Key props                                                                                                                                                                 |
| ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Heading** | Semantic headings with predefined variants | `variant`: `hero`, `detail`, `subtitle`, `section`, `cardTitle`, `component`, `mdxH1`-`mdxH4`. `as`: override element (`h1`-`h6`, `p`)                                    |
| **Text**    | Body text with semantic variants           | `variant`: `body`, `bodyLg`, `subtitle`, `cardDescription`, `detail`, `label`, `meta`, `caption`, `helper`, `error`. `as`: override element (`p`, `span`, `div`, `label`) |

### Layout

| Component               | Description                                | Key props                              |
| ----------------------- | ------------------------------------------ | -------------------------------------- |
| **Container**           | Max-width centered container               | `size`: `sm`, `md`, `lg`, `xl`, `full` |
| **Grid** / **GridItem** | CSS Grid wrapper                           | `cols`, `gap`, `responsive`            |
| **PageContainer**       | Page-level wrapper with consistent padding | `wide`                                 |
| **PageLayout**          | Full page layout with sections             | `wide`                                 |
| **Section**             | Semantic section with spacing              | `id`, `className`                      |
| **SectionLabel**        | Section header with icon + label           | `icon`, `label`                        |
| **Spacer**              | Vertical/horizontal spacing                | `size`: `xs`-`xl`                      |
| **Stack**               | Flex stack (vertical/horizontal)           | `direction`, `gap`, `align`, `justify` |
| **Sidebar**             | Navigation sidebar                         | `items`, `activeItem`                  |

### Data display

| Component                                                                    | Description                                 | Key props                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Avatar**                                                                   | User avatar with fallback                   | `src`, `alt`, `size`                                                                |
| **Badge**                                                                    | Status/category label                       | `variant`: `default`, `brand`, `brand-solid`, `success`, `warning`, `error`, `info` |
| **Breadcrumb**                                                               | Navigation breadcrumb trail                 | `items: BreadcrumbItem[]`                                                           |
| **Card** / **CardHeader** / **CardTitle** / **CardContent** / **CardFooter** | Composable card                             | Standard card sections                                                              |
| **CTACard**                                                                  | Call-to-action card with heading and action | `title`, `description`, `action`                                                    |
| **Divider**                                                                  | Horizontal rule with optional label         | `label`                                                                             |
| **Kbd**                                                                      | Keyboard shortcut display                   | `children` (key text)                                                               |
| **Pagination**                                                               | Page navigation controls                    | `currentPage`, `totalPages`, `onPageChange`                                         |
| **ProgressBar**                                                              | Progress indicator                          | `value`, `max`, `variant`                                                           |
| **Skeleton**                                                                 | Loading placeholder                         | `width`, `height`, `variant`: `text`, `circular`, `rectangular`                     |
| **StatsCard**                                                                | Metric display card                         | `label`, `value`, `subtitle`, `trend`                                               |
| **StructuredData**                                                           | JSON-LD script injection                    | `data`                                                                              |
| **Table**                                                                    | Data table with sorting                     | `columns: Column[]`, `data`, `sortable`                                             |
| **Tabs**                                                                     | Tab navigation                              | `tabs: Tab[]`, `activeTab`, `onTabChange`                                           |
| **Tooltip**                                                                  | Hover tooltip                               | `content`, `position`                                                               |

### Forms

| Component          | Description                    | Key props                                                                                 |
| ------------------ | ------------------------------ | ----------------------------------------------------------------------------------------- |
| **Button**         | Button with variants and sizes | `variant`: `primary`, `secondary`, `ghost`, `outline`, `danger`. `size`: `sm`, `md`, `lg` |
| **Checkbox**       | Checkbox input                 | `checked`, `onChange`, `label`                                                            |
| **FormFieldError** | Validation error message       | `message`, `id` (for `aria-describedby`)                                                  |
| **Input**          | Text input with label/error    | `label`, `error`, `helper`                                                                |
| **Select**         | Select dropdown                | `options: SelectOption[]`, `label`, `error`                                               |
| **Switch**         | Toggle switch                  | `checked`, `onChange`, `label`                                                            |
| **Textarea**       | Multi-line text input          | `label`, `error`, `helper`                                                                |

### Feedback

| Component                        | Description               | Key props                                                             |
| -------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| **Alert**                        | Contextual alert banner   | `variant`: `info`, `success`, `warning`, `error`. `title`, `children` |
| **Dropdown**                     | Action menu               | `items: DropdownItem[]`, `trigger`                                    |
| **Loading**                      | Full-area loading spinner | `message`                                                             |
| **Modal**                        | Dialog overlay            | `open`, `onClose`, `title`                                            |
| **Spinner**                      | Inline loading indicator  | `size`: `sm`, `md`, `lg`                                              |
| **ToastProvider** / **useToast** | Toast notification system | `toast({ variant, title, description })`                              |

### Theming

| Component                        | Description                   | Key props                                  |
| -------------------------------- | ----------------------------- | ------------------------------------------ |
| **ThemeProvider** / **useTheme** | Theme context provider        | Wraps app, provides `theme`, `toggleTheme` |
| **ThemeToggle**                  | Dark/light mode toggle button | Uses `useTheme` internally                 |

### Decorative

| Component       | Description                  | Key props   |
| --------------- | ---------------------------- | ----------- |
| **AspectRatio** | Fixed aspect ratio container | `ratio`     |
| **GridBg**      | Decorative grid background   | `className` |

## Utilities

| Export                        | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `cn(...classes)`              | Tailwind-aware class merging (`clsx` + `tailwind-merge`) |
| `validateProps(props, rules)` | Runtime prop validation helper                           |
| `ErrorBoundary`               | React error boundary component                           |
| `ModalErrorBoundary`          | Error boundary scoped to modals                          |

## TypeScript

All components export their prop types (e.g., `ButtonProps`, `AlertProps`). The library is built with `exactOptionalPropertyTypes` compatibility.

```tsx
import type { ButtonProps, ButtonVariant } from '@danieljoffe.com/shared-ui';
```

## Tree-shaking

Use deep imports for optimal bundle size:

```tsx
// Only bundles Button code:
import { Button } from '@danieljoffe.com/shared-ui/Button';

// Bundles everything (barrel import):
import { Button } from '@danieljoffe.com/shared-ui';
```

## React 19 ref pattern

Components accept `ref` as a regular prop — `forwardRef` is not used. This is the React 19 pattern:

```tsx
import { useRef } from 'react';
import { Input } from '@danieljoffe.com/shared-ui/Input';

function MyForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  return <Input ref={inputRef} label='Name' />;
}
```

## Constraints

- **No Next.js APIs**: This library depends only on React and Tailwind CSS. Components requiring `next/link`, `next/image`, `useRouter`, etc. belong in the consuming app's `components/kit/` directory.
- **No framework-specific code**: Components work in any React 19+ environment with Tailwind CSS 4.

## Development

```bash
# Run unit tests
npx nx test @danieljoffe.com/shared-ui

# Start Storybook
npx nx storybook @danieljoffe.com/shared-ui

# Build library
npx nx build @danieljoffe.com/shared-ui
```

## Contributing

This library lives in the [danieljoffe.com monorepo](https://github.com/danieljoffe/danieljoffe.com) at `libs/shared/ui/`. See the root `CLAUDE.md` for conventions around the Rule of Three, component patterns, and the shared-ui boundary.
