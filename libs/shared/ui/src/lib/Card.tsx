import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
  elevated?: boolean;
  padding?: CardPadding;
}

export interface CardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
}

export interface CardTitleProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  'children'
> {
  children: ReactNode;
}

export interface CardContentProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { children, className, elevated = false, padding = 'md', ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border',
          elevated ? 'bg-background-elevated' : 'bg-card',
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mb-4', className)} {...props}>
        {children}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3 ref={ref} className={cn(className)} {...props}>
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(className)} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = 'CardContent';
