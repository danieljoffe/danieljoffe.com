import type React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

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
}

// Props when rendering as a native <button>
export interface AsButtonProps extends ButtonProps {
  as?: 'button';
}

// Props when rendering as a link (<a> via next/link)
export interface AsLinkProps
  extends
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    Omit<ButtonBase, 'children'> {
  as: 'link';
  highlighted?: boolean;
  outline?: boolean;
  disabled?: boolean;
}

// Discriminated union
export type AppButtonProps = AsButtonProps | AsLinkProps;
