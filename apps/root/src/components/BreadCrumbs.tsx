'use client';
import { type MouseEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Button from '@/components/Button';
import { useViewTransitionNavigate } from '@/components/ViewTransitions';
import type { BreadCrumbsProps } from '@/types/base';

export default function BreadCrumbs({
  items,
  coverTransitionName,
}: BreadCrumbsProps) {
  const pathname = usePathname();
  const navigate = useViewTransitionNavigate();

  if (items == null) return null;

  const handleCrumbClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    // Let the browser handle modified clicks (open in new tab, etc.).
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    // Morph the detail hero into the matching card on the destination list.
    navigate(href, coverTransitionName);
  };

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
              <Button
                as='link'
                variant='bare'
                size='sm'
                href={item.href}
                onClick={
                  coverTransitionName
                    ? event => handleCrumbClick(event, item.href)
                    : undefined
                }
              >
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
