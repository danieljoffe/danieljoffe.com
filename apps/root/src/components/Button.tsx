'use client';
import React, {
  useCallback,
  type ComponentProps,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { Url } from 'next/dist/shared/lib/router/router';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

type ButtonVariant =
  | 'bare'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBase {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  name?: string;
}

interface ButtonProps
  extends
    ButtonBase,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  loading?: boolean;
  iconOnly?: boolean;
}

interface AsButtonProps extends ButtonProps {
  as?: 'button';
  ref?: React.Ref<HTMLButtonElement>;
}

interface AsLinkProps
  extends
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    Omit<ButtonBase, 'children'> {
  as: 'link';
  highlighted?: boolean;
  outline?: boolean;
  disabled?: boolean;
}

type AppButtonProps = AsButtonProps | AsLinkProps;

const baseButtonStyles =
  'inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer motion-reduce:transition-none motion-reduce:hover:transform-none';

const variantButtonStyles: Record<string, string> = {
  primary:
    'hover:shadow-lg/12.5 bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  secondary:
    'hover:shadow-lg/12.5 bg-surface-elevated text-text-primary hover:bg-surface border border-border',
  ghost:
    'hover:shadow-lg/12.5 text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
  outline:
    'hover:shadow-lg/12.5 border border-border-secondary text-text-primary hover:bg-surface-elevated',
  success: 'hover:shadow-lg/12.5 bg-success text-white hover:opacity-90',
  error: 'hover:shadow-lg/12.5 bg-error text-text-inverse hover:opacity-90',
  warning: 'hover:shadow-lg/12.5 bg-warning text-text-inverse hover:opacity-90',
  info: 'hover:shadow-lg/12.5 bg-info text-text-inverse hover:opacity-90',
  bare: '',
};

const sizeButtonStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm hover:scale-[1.1]',
  md: 'px-4 py-3 hover:scale-[1.05]',
  lg: 'px-6 py-3 text-lg hover:scale-[1.025]',
};

const iconOnlySizeStyles: Record<string, string> = {
  sm: 'p-1.5 text-sm hover:scale-[1.1]',
  md: 'p-2.5 hover:scale-[1.05]',
  lg: 'p-3 text-lg hover:scale-[1.025]',
};

const variantLinkOutline: Record<string, string> = {
  bare: 'focus-visible:ring-offset-0',
};

function LinkAsButton(props: AsLinkProps) {
  const router = useRouter();
  const {
    as: _as,
    highlighted,
    outline,
    disabled,
    variant,
    size,
    children,
    className,
    ...rest
  } = props;
  const classes = cn(
    baseButtonStyles,
    variantButtonStyles[variant ?? 'primary'],
    sizeButtonStyles[size ?? 'md'],
    highlighted && 'text-brand-500 underline underline-offset-4',
    disabled && 'pointer-events-none',
    outline && variantLinkOutline[variant ?? 'bare'],
    className
  );

  const handleMouseEnter = useCallback(
    (href: Url) => {
      if (href && href.toString().startsWith('/')) {
        router.prefetch(href.toString());
      }
    },
    [router]
  );

  if (rest.href == null || rest.href.length === 0) return null;

  if (disabled) {
    return (
      <span className={classes} aria-disabled={true} role='link' tabIndex={-1}>
        {children}
      </span>
    );
  }

  const {
    href,
    id,
    target,
    'aria-label': ariaLabel,
  } = rest as ComponentProps<typeof Link>;

  const rel = target === '_blank' ? 'noopener noreferrer' : undefined;

  return (
    <Link
      {...(rest as ComponentProps<typeof Link>)}
      className={classes}
      onMouseEnter={() => handleMouseEnter(href)}
      id={id ?? ariaLabel?.replace(' ', '-')}
      href={href}
      aria-label={ariaLabel}
      rel={rel}
    >
      {children}
    </Link>
  );
}

function Button(props: AppButtonProps) {
  const { as, ...rest } = props;

  if (as === 'link') {
    return <LinkAsButton {...(rest as Omit<AsLinkProps, 'as'>)} as='link' />;
  }

  const { onClick, ref, ...restButton } = rest as Omit<AsButtonProps, 'as'>;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!restButton.disabled && onClick) {
        onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
      }
    }
  };

  const {
    type = 'button',
    children,
    variant,
    size,
    iconOnly,
    className,
    ...buttonRest
  } = restButton;

  const sizeMap = iconOnly ? iconOnlySizeStyles : sizeButtonStyles;

  return (
    <button
      {...buttonRest}
      ref={ref}
      disabled={restButton.disabled}
      type={type}
      onClick={restButton.disabled ? undefined : onClick}
      onKeyDown={onKeyDown}
      className={cn(
        baseButtonStyles,
        variantButtonStyles[variant ?? 'primary'],
        sizeMap[size ?? 'md'],
        className
      )}
    >
      {children}
    </button>
  );
}

export default Button;
