import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

export type UIButtonVariantT =
  | 'bare'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export type UIButtonSizeT = 'sm' | 'md' | 'lg';
export interface UIButtonBaseI {
  variant?: UIButtonVariantT;
  size?: UIButtonSizeT;
  children: ReactNode;
}

export interface UIButtonProps
  extends
    UIButtonBaseI,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {}

export const baseUIButtonStyles = [
  'inline-flex items-center justify-center gap-2 rounded-md transition',
  'duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  'focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed',
  'hover:cursor-pointer motion-reduce:transition-none motion-reduce:hover:transform-none',
].join(' ');

const regularButton = 'hover:shadow-lg/12.5';
export const variantUIButtonStyles: Record<UIButtonVariantT, string> = {
  bare: '',
  primary: `${
    regularButton
  } bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active`,
  secondary: `${
    regularButton
  } bg-background-elevated text-foreground hover:bg-border-strong border border-border`,
  ghost: `${
    regularButton
  } text-foreground-muted hover:bg-background-elevated hover:text-foreground`,
  outline: `${
    regularButton
  } border border-border-strong text-foreground hover:bg-background-elevated`,
  accent: `${regularButton} bg-accent text-accent-foreground hover:opacity-90`,
  success: `${regularButton} bg-success text-success-foreground hover:opacity-90`,
  error: `${regularButton} bg-error text-error-foreground hover:opacity-90`,
  warning: `${regularButton} bg-warning text-warning-foreground hover:opacity-90`,
  info: `${regularButton} bg-info text-info-foreground hover:opacity-90`,
};

const baseOutline =
  'hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5';
export const variantUILinkOutline: Record<UIButtonVariantT, string> = {
  bare: '',
  primary: `${baseOutline} hover:outline-accent`,
  secondary: `${baseOutline} hover:outline-border-strong`,
  ghost: `${baseOutline} hover:outline-foreground-muted`,
  outline: `${baseOutline} hover:outline-border-strong`,
  accent: `${baseOutline} hover:outline-accent`,
  success: `${baseOutline} hover:outline-success`,
  error: `${baseOutline} hover:outline-error`,
  warning: `${baseOutline} hover:outline-warning`,
  info: `${baseOutline} hover:outline-info`,
};

export const sizeUIButtonStyles: Record<UIButtonSizeT, string> = {
  sm: 'px-3 py-1.5 text-sm hover:scale-[1.1]',
  md: 'px-4 py-3 hover:scale-[1.05]',
  lg: 'px-6 py-3 text-lg hover:scale-[1.025]',
};

export const Button = forwardRef<HTMLButtonElement, UIButtonProps>(
  (
    { variant = 'primary', size = 'md', children, className, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          baseUIButtonStyles,
          variantUIButtonStyles[variant],
          sizeUIButtonStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
