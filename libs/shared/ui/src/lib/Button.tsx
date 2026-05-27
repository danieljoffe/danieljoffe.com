import {
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react';
import { Spinner } from './Spinner';
import { DISABLED, FOCUS_RING, FOCUS_RING_OFFSET } from './styles/formStyles';
import { cn } from './utils';

export type ButtonVariant = 'bare' | 'primary' | 'secondary' | 'outline';

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

const regularButton = 'hover:shadow-lg/12.5';
export const variantButtonStyles: Record<ButtonVariant, string> = {
  bare: '',
  primary: `${
    regularButton
    // ``text-text-on-brand`` (themed) instead of hardcoded ``text-white``.
    // Pyre's chartreuse brand-500 with white text was 2.76:1 (below AA);
    // the token resolves to near-black on pyre and white on indigo.
  } bg-brand-500 text-text-on-brand hover:bg-brand-600 active:bg-brand-700`,
  secondary: `${
    regularButton
  } bg-surface-elevated text-text-primary hover:bg-surface border border-border`,
  outline: `${
    regularButton
  } border border-border-secondary text-text-primary hover:bg-surface-elevated`,
};

const baseOutline =
  'hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5';
export const variantLinkOutline: Record<ButtonVariant, string> = {
  bare: '',
  primary: `${baseOutline} hover:outline-brand-500`,
  secondary: `${baseOutline} hover:outline-border-strong`,
  outline: `${baseOutline} hover:outline-border-strong`,
};

export const sizeButtonStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm hover:scale-[1.1]',
  md: 'px-4 py-3 hover:scale-[1.05]',
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
