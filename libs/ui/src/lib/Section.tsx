import type { ReactNode } from 'react';

export interface SectionProps {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'default' | 'alt' | 'elevated';
  className?: string;
}

const paddingClasses = {
  none: 'py-0',
  sm: 'py-4 sm:py-6',
  md: 'py-8 sm:py-12',
  lg: 'py-12 sm:py-16',
  xl: 'py-16 sm:py-24',
};

const backgroundClasses = {
  default: 'bg-background',
  alt: 'bg-background-alt',
  elevated: 'bg-background-elevated',
};

export function Section({
  children,
  padding = 'md',
  background = 'default',
  className = '',
}: SectionProps) {
  return (
    <section
      className={`${paddingClasses[padding]} ${backgroundClasses[background]} ${className}`}
    >
      {children}
    </section>
  );
}
