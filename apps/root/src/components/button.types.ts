import type React from 'react';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'icon'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStateInterface {
  enabled?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
}

// Base props shared across variants
export interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

// Props when rendering as a native <button>
export interface ButtonAsButtonProps
  extends Omit<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      'href' | 'target' | 'rel' | 'className' | 'children' | 'disabled'
    >,
    Omit<BaseButtonProps, 'className' | 'children'> {
  as?: 'button';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  name?: string;
}

// Props when rendering as a link (<a> via next/link)
export interface ButtonAsLinkProps
  extends Omit<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      'className' | 'children'
    >,
    BaseButtonProps {
  as: 'link';
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  highlighted?: boolean;
  'aria-current'?: React.AriaAttributes['aria-current'];
  'aria-label'?: React.AriaAttributes['aria-label'];
  title?: string;
  id?: string;
}

// Discriminated union
export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;
