import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from 'react';
import { Spinner } from './Spinner';
import { DISABLED, FOCUS_RING, FOCUS_RING_OFFSET } from './styles/formStyles';
import { cn } from './utils';

export type ButtonVariant =
  | 'bare'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

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
  loading?: boolean;
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
  } bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700`,
  secondary: `${
    regularButton
  } bg-surface-elevated text-text-primary hover:bg-surface border border-border`,
  ghost: `${
    regularButton
  } text-text-secondary hover:bg-surface-elevated hover:text-text-primary`,
  outline: `${
    regularButton
  } border border-border-secondary text-text-primary hover:bg-surface-elevated`,
  success: `${regularButton} bg-success text-white hover:opacity-90`,
  error: `${regularButton} bg-error text-text-inverse hover:opacity-90`,
  warning: `${regularButton} bg-warning text-text-inverse hover:opacity-90`,
  info: `${regularButton} bg-info text-text-inverse hover:opacity-90`,
};

const baseOutline =
  'hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5';
export const variantLinkOutline: Record<ButtonVariant, string> = {
  bare: '',
  primary: `${baseOutline} hover:outline-brand-500`,
  secondary: `${baseOutline} hover:outline-border-strong`,
  ghost: `${baseOutline} hover:outline-foreground-muted`,
  outline: `${baseOutline} hover:outline-border-strong`,
  success: `${baseOutline} hover:outline-success`,
  error: `${baseOutline} hover:outline-error`,
  warning: `${baseOutline} hover:outline-warning`,
  info: `${baseOutline} hover:outline-info`,
};

export const sizeButtonStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm hover:scale-[1.1]',
  md: 'px-4 py-3 hover:scale-[1.05]',
  lg: 'px-6 py-3 text-lg hover:scale-[1.025]',
};

const spinnerSizeStyles: Record<ButtonSize, string> = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      as: Component = 'button',
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(
          baseButtonStyles,
          variantButtonStyles[variant],
          sizeButtonStyles[size],
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
);

Button.displayName = 'Button';
