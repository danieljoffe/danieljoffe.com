import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'ghost'
    | 'outline'
    | 'accent'
    | 'success'
    | 'error'
    | 'warning'
    | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary:
      'bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active',
    secondary:
      'bg-background-elevated text-foreground hover:bg-border-strong border border-border',
    ghost:
      'text-foreground-muted hover:bg-background-elevated hover:text-foreground',
    outline:
      'border border-border-strong text-foreground hover:bg-background-elevated',
    accent: 'bg-accent text-accent-foreground hover:opacity-90',
    success: 'bg-success text-success-foreground hover:opacity-90',
    error: 'bg-error text-error-foreground hover:opacity-90',
    warning: 'bg-warning text-warning-foreground hover:opacity-90',
    info: 'bg-info text-info-foreground hover:opacity-90',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-3',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
