'use client';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Button from '@/components/Button';
import type { BreadCrumbsProps } from '@/types/base';

export default function BreadCrumbs({ items }: BreadCrumbsProps) {
  const pathname = usePathname();

  if (items == null) return null;

  return (
    <nav aria-label='Breadcrumb' className='flex'>
      <ol className='flex flex-row gap-2'>
        {items.map(item => (
          <li key={item.href} className='flex items-center'>
            {pathname === item.href ? (
              <p aria-current='page' className='font-bold text-sm'>
                {item.label}
              </p>
            ) : (
              <Button as='link' variant='bare' size='sm' href={item.href}>
                {item.label}
                <span
                  className='flex h-full items-center justify-center'
                  aria-hidden='true'
                >
                  <ChevronRight absoluteStrokeWidth={true} className='size-4' />
                </span>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
