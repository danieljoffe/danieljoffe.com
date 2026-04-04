import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { cn } from './utils';

export interface SectionProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className'
> {
  ref?: Ref<HTMLElement> | undefined;
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'default' | 'alt' | 'elevated' | 'none';
  /** Center children horizontally using flexbox */
  center?: boolean;
  /** Control overflow behavior */
  overflow?: 'visible' | 'hidden' | 'auto';
  /** Full width section */
  fullWidth?: boolean;
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
  default: 'bg-surface',
  alt: 'bg-surface-secondary',
  elevated: 'bg-surface-elevated',
  none: '',
};

const overflowClasses = {
  visible: 'overflow-visible',
  hidden: 'overflow-hidden',
  auto: 'overflow-auto',
};

export function Section({
  children,
  padding = 'none',
  background = 'none',
  center = true,
  overflow = 'hidden',
  fullWidth = true,
  className,
  ref,
  ...rest
}: SectionProps) {
  return (
    <section
      ref={ref}
      className={cn(
        paddingClasses[padding],
        backgroundClasses[background],
        overflowClasses[overflow],
        center && 'flex flex-col justify-center',
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </section>
  );
}
