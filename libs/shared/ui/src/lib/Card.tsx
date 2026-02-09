import type { ReactNode } from 'react';
import { cn } from './utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  padding?: CardPadding;
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className,
  elevated = false,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border',
        elevated ? 'bg-background-elevated' : 'bg-card',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h3 className={cn(className)}>{children}</h3>;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn(className)}>{children}</div>;
}
