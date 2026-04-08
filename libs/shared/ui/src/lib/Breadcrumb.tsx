import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className='flex items-center gap-1'>
            {i > 0 && (
              <ChevronRight className='h-3.5 w-3.5 text-text-tertiary' />
            )}
            {isLast ? (
              <span className='font-medium text-text-primary flex items-center gap-1.5'>
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
