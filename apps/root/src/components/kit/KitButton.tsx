import { type ReactNode, type ButtonHTMLAttributes } from 'react';

type KitButtonVariant = 'primary' | 'secondary';

const variantStyles: Record<KitButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-border text-text-primary hover:bg-surface-tertiary',
};

export function KitButton({
  variant = 'primary',
  children,
  className = '',
  ...props
}: {
  variant?: KitButtonVariant;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>) {
  return (
    <button
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
