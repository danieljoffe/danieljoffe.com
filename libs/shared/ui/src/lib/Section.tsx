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
   * Constrain the section's content to a max-width Container. Defaults to
   * `'sm'`, so a Section contains its own content (full-width bar, centered
   * column). Pass a larger size for wide layouts, or `'none'` for a full-bleed
   * section that manages its own width — e.g. a hero with an edge-to-edge
   * backdrop and a separately-contained content column.
   */
  contain?: ContainerSize | 'none' | undefined;
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
  contain = 'sm',
  className,
  ...rest
}: SectionProps) {
  const content =
    contain === 'none' ? (
      children
    ) : (
      <Container size={contain}>{children}</Container>
    );

  const isElevated = background === 'elevated';

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
        // Elevated sections float inside their parent — pull off the edges
        // and add internal horizontal padding so content isn't flush to the
        // card surface.
        isElevated && 'max-w-[calc(100%-2rem)] mx-auto px-4 sm:px-6 md:px-8',
        className
      )}
      {...rest}
    >
      {content}
    </section>
  );
}
