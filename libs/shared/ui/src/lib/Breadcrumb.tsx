import { ChevronRight } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'className'
> {
  ref?: Ref<HTMLElement> | undefined;
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({
  items,
  className,
  ref,
  ...rest
}: BreadcrumbProps) {
  return (
    <nav
      ref={ref}
      aria-label='Breadcrumb'
      className={cn('flex items-center gap-1 text-sm', className)}
      {...rest}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className='flex items-center gap-1'>
            {i > 0 && (
              <ChevronRight
                aria-hidden='true'
                className='h-3.5 w-3.5 text-text-tertiary'
              />
            )}
            {isLast ? (
              <span
                aria-current='page'
                className='font-medium text-text-primary flex items-center gap-1.5'
              >
                {item.icon}
                {item.label}
              </span>
            ) : (
              <a
                href={item.href || '#'}
                className='text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5'
              >
                {item.icon}
                {item.label}
              </a>
            )}
          </div>
        );
      })}
    </nav>
  );
}
