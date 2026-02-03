'use client';
import React, { useCallback, type ComponentProps } from 'react';
import { Link } from 'next-transition-router';
import { Url } from 'next/dist/shared/lib/router/router';
import { useRouter } from 'next/navigation';
import {
  baseUIButtonStyles,
  sizeUIButtonStyles,
  variantUIButtonStyles,
  Button as UIButton,
} from '@danieljoffe.com/ui';
import { devLog } from '@/utils/helpers';
import { AsButtonProps, AsLinkProps, ButtonProps } from './Button.types';

function LinkAsButton(props: AsLinkProps) {
  const router = useRouter();
  const {
    as: _as,
    highlighted,
    disabled,
    variant,
    size,
    children,
    className,
    ...rest
  } = props;
  const classes = [
    baseUIButtonStyles,
    variantUIButtonStyles[variant ?? 'primary'],
    sizeUIButtonStyles[size ?? 'md'],
    highlighted ? 'text-accent underline underline-offset-4' : '',
    className ?? '',
  ]
    .concat(disabled ? 'pointer-events-none' : '')
    .filter(Boolean)
    .join(' ');

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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    const { as, ...rest } = props;

    if (as === 'link') {
      return <LinkAsButton {...(rest as Omit<AsLinkProps, 'as'>)} as='link' />;
    }

    const { onClick, ...restButton } = rest as Omit<AsButtonProps, 'as'>;

    const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!restButton.disabled && onClick) {
          onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }
      }
    };

    const { type, children, ...buttonRest } = restButton;

    if (buttonRest.name == null || buttonRest.name === '') {
      devLog('Button component: name is required');
    }

    return (
      <UIButton
        {...buttonRest}
        ref={ref}
        disabled={restButton.disabled}
        type={type ?? 'button'}
        onClick={restButton.disabled ? undefined : onClick}
        onKeyDown={onKeyDown}
      >
        {children}
      </UIButton>
    );
  }
);

Button.displayName = 'Button';
export default Button;
