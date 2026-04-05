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

Import the theme CSS to get design tokens (colors, spacing, typography, shadows):

```css
/* In your global CSS or Tailwind entry point */
@import '@danieljoffe.com/shared-ui/styles/theme.css';
```

The theme uses Tailwind CSS 4's `@theme` directive with oklch color space. Tokens include:

- **Colors**: `brand`, `surface`, `text`, `border`, `error`, `success`, `warning`, `info` scales
- **Typography**: `font-sans` (Inter), `font-mono` (JetBrains Mono)
- **Spacing/Radius**: `radius-sm` through `radius-full`
- **Shadows**: `shadow-xs` through `shadow-xl`
- **Animations**: `fade-in`, `slide-up`, `slide-down`, `scale-in`

To customize tokens, override the CSS variables in your own `@theme` block after the import.

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
