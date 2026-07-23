import {
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react';
import { Spinner } from './Spinner';
import { DISABLED, FOCUS_RING, FOCUS_RING_OFFSET } from './styles/formStyles';
import type { SemanticVariant } from './styles/semanticVariants';
import { cn } from './utils';

/**
 * Button variants span two axes:
 * - **Emphasis** — `bare` | `primary` | `secondary` | `outline`
 * - **Intent** — the shared `SemanticVariant` scale (`error` | `warning` |
 *   `success` | `info`), rendered as solid, high-emphasis fills for definitive
 *   attention-demanding actions. There are intentionally no low-emphasis
 *   semantic combos (a quiet "danger" button is a whispered alarm); intent
 *   only rides the definitive, filled variants.
 */
export type ButtonVariant =
  | 'bare'
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'strong'
  | SemanticVariant;

export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonBase {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

export interface ButtonProps
  extends
    ButtonBase,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  ref?: Ref<HTMLButtonElement> | undefined;
  loading?: boolean;
  iconOnly?: boolean;
  as?: ElementType;
  href?: string;
  target?: string;
  rel?: string;
}

export const baseButtonStyles = [
  'inline-flex items-center justify-center gap-2 rounded-md transition',
  `duration-200 ${FOCUS_RING} ${FOCUS_RING_OFFSET}`,
  DISABLED,
  'hover:cursor-pointer motion-reduce:transition-none motion-reduce:hover:transform-none',
].join(' ');

// Shared by every non-`bare` variant. `font-bold` gives filled labels a
// definitive weight. `border border-transparent` reserves a 1px border box so
// the borderless fills (primary/strong/semantic) render at the *exact* same
// size as the visibly-bordered secondary/outline — a 1px border on an
// auto-height box changes its footprint, so without this the fills would be
// ~2px smaller and variant would silently change a button's size. `bare` opts
// out (it never gets regularButton), staying a true blank slate — e.g. Sidebar
// items own their own weight and size.
const regularButton =
  'font-bold hover:shadow-lg/12.5 border border-transparent';

// Solid semantic (status) fills. The `*-solid` tokens are deep and
// mode-independent (unlike `bg-error` etc., which lighten in dark mode for
// text legibility), so white `text-on-semantic` clears WCAG AA on every fill in
// both themes — a danger button reads as deep-red with white text, not a pale
// tint. hover/active darken via `brightness` — `filter` is covered by the base
// `transition`, so it animates like the brand variant's bg shift.
const semanticFill = (bg: string) =>
  `${regularButton} ${bg} text-on-semantic hover:brightness-95 active:brightness-90`;

export const variantButtonStyles: Record<ButtonVariant, string> = {
  bare: '',
  primary: `${
    regularButton
    // ``text-on-brand`` (themed) instead of hardcoded ``text-white``.
    // Pyre's chartreuse brand-500 with white text was 2.76:1 (below AA);
    // the token resolves to near-black on pyre and white on indigo.
  } bg-brand-500 text-on-brand hover:bg-brand-600 active:bg-brand-700`,
  // Highest-emphasis brand action: a deep brand fill that carries WHITE text
  // at AA. Chartreuse brand-500 is too light for white (2.76:1 on Pyre), so
  // `strong` uses the purpose-built `brand-strong` token instead. hover/active
  // darken via `brightness` — which only *raises* contrast with the white
  // label — matching the semantic solids rather than primary's bg steps.
  strong: `${
    regularButton
  } bg-brand-strong text-on-brand-strong hover:brightness-95 active:brightness-90`,
  secondary: `${
    regularButton
  } bg-surface-elevated text-text-primary hover:bg-surface border border-border`,
  outline: `${
    regularButton
  } border border-border-secondary text-text-primary hover:bg-surface-elevated`,
  error: semanticFill('bg-error-solid'),
  warning: semanticFill('bg-warning-solid'),
  success: semanticFill('bg-success-solid'),
  info: semanticFill('bg-info-solid'),
};

const baseOutline =
  'hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5';
export const variantLinkOutline: Record<ButtonVariant, string> = {
  bare: '',
  primary: `${baseOutline} hover:outline-brand-500`,
  strong: `${baseOutline} hover:outline-brand-strong`,
  secondary: `${baseOutline} hover:outline-border-strong`,
  outline: `${baseOutline} hover:outline-border-strong`,
  error: `${baseOutline} hover:outline-error`,
  warning: `${baseOutline} hover:outline-warning`,
  success: `${baseOutline} hover:outline-success`,
  info: `${baseOutline} hover:outline-info`,
};

export const sizeButtonStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm hover:scale-[1.1]',
  md: 'px-4 py-2 hover:scale-[1.05]',
  lg: 'px-6 py-3 text-lg hover:scale-[1.025]',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5 text-sm hover:scale-[1.1]',
  md: 'p-2.5 hover:scale-[1.05]',
  lg: 'p-3 text-lg hover:scale-[1.025]',
};

const spinnerSizeStyles: Record<ButtonSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconOnly = false,
  as: Component = 'button',
  children,
  className,
  disabled,
  ref,
  ...props
}: ButtonProps) {
  return (
    <Component
      ref={ref}
      className={cn(
        baseButtonStyles,
        variantButtonStyles[variant],
        iconOnly ? iconOnlySizeStyles[size] : sizeButtonStyles[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <Spinner
          size='sm'
          className={cn(
            'border-current/30 border-t-current',
            spinnerSizeStyles[size]
          )}
          aria-hidden='true'
        />
      )}
      {children}
    </Component>
  );
}
