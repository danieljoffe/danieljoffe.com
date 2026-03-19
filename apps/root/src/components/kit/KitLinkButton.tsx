import { type ReactNode, type AnchorHTMLAttributes } from 'react';

type KitLinkButtonVariant = 'primary' | 'secondary';

const variantStyles: Record<KitLinkButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-border text-text-primary hover:bg-surface-tertiary',
};

export function KitLinkButton({
  variant = 'primary',
  children,
  className = '',
  ...props
}: {
  variant?: KitLinkButtonVariant;
  children: ReactNode;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className'>) {
  return (
    <a
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
