import type React from 'react';
import { UIButtonBaseI, UIButtonProps } from '@danieljoffe.com/shared-ui';

// Props when rendering as a native <button>
export interface AsButtonProps extends UIButtonProps {
  as?: 'button';
}

// Props when rendering as a link (<a> via next/link)
export interface AsLinkProps
  extends
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    Omit<UIButtonBaseI, 'children'> {
  as: 'link';
  highlighted?: boolean;
  outline?: boolean;
  disabled?: boolean;
}

// Discriminated union
export type ButtonProps = AsButtonProps | AsLinkProps;
