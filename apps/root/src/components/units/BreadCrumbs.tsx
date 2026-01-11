'use client';
import { ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/assembled/Nav/Links';
import { usePathname } from 'next/navigation';
import Button from '@/components/units/Button';

export default function BreadCrumbs({ items }: { items: NavLink[] }) {
  const pathname = usePathname();

  if (items == null) return null;

  return (
    <nav aria-label='Breadcrumb'>
      <ol className='flex gap-2 items-center'>
        {items.map((item, index) => (
          <li key={item.href} className='flex items-center'>
            {pathname === item.href ? (
              <p aria-current='page' className='font-sans font-bold text-sm'>
                {item.label}
              </p>
            ) : (
              <Button as='link' variant='link' size='sm' href={item.href}>
                {item.label}
                {index !== items.length - 1 && (
                  <span
                    className='flex h-full items-center justify-center'
                    aria-hidden='true'
                  >
                    <ChevronRight
                      absoluteStrokeWidth={true}
                      className='w-4 h-4'
                    />
                  </span>
                )}
              </Button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
