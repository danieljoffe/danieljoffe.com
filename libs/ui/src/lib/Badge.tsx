import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default:
      'bg-background-elevated text-foreground-muted border border-border',
    accent: 'bg-accent-muted text-accent border border-accent/30',
    success: 'bg-success-muted text-success border border-success/30',
    warning: 'bg-warning-muted text-warning border border-warning/30',
    error: 'bg-error-muted text-error border border-error/30',
    info: 'bg-info-muted text-info border border-info/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
