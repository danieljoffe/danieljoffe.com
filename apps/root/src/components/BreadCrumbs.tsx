'use client';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Button from '@/components/Button';
import { BreadCrumbsI } from '@/types/base';
import { Stack } from '@danieljoffe.com/ui';

export default function BreadCrumbs({ items }: BreadCrumbsI) {
  const pathname = usePathname();

  if (items == null) return null;

  return (
    <Stack aria-label='Breadcrumb' as='nav'>
      <Stack as='ol' gap='sm' direction='horizontal'>
        {items.map(item => (
          <li key={item.href} className='flex items-center'>
            {pathname === item.href ? (
              <p aria-current='page' className='font-bold text-sm'>
                {item.label}
              </p>
            ) : (
              <Button as='link' variant='link' size='sm' href={item.href}>
                {item.label}
                <span
                  className='flex h-full items-center justify-center'
                  aria-hidden='true'
                >
                  <ChevronRight
                    absoluteStrokeWidth={true}
                    className='w-4 h-4'
                  />
                </span>
              </Button>
            )}
          </li>
        ))}
      </Stack>
    </Stack>
  );
}
