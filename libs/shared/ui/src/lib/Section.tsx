import { type ReactNode, type HTMLAttributes, type Ref } from 'react';
import { Container, type ContainerSize } from './Container';
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
  /**
   * Wrap children in a Container with the given size.
   * Use this for standalone sections (outside PageLayout) that need
   * their own max-width constraint and horizontal padding.
   */
  contain?: ContainerSize | undefined;
  className?: string;
}

const paddingClasses = {
  none: 'py-0',
  sm: 'py-4 sm:py-6',
  md: 'py-6 sm:py-8 md:py-12',
  lg: 'py-8 sm:py-12 md:py-16',
  xl: 'py-12 sm:py-16 md:py-24',
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
  ref,
  padding = 'md',
  background = 'none',
  center = false,
  overflow = 'visible',
  fullWidth = true,
  contain,
  className,
  ...rest
}: SectionProps) {
  const content = contain ? (
    <Container size={contain}>{children}</Container>
  ) : (
    children
  );

  return (
    <section
      ref={ref}
      className={cn(
        'relative',
        paddingClasses[padding],
        backgroundClasses[background],
        overflowClasses[overflow],
        center && 'flex flex-col justify-center',
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {content}
    </section>
  );
}
