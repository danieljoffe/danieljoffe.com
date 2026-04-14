import { Calendar, Clock, Tag } from 'lucide-react';
import Image from 'next/image';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { PostBodyProps } from '@/types/postTypes';
import { TableOfContents } from '@/components/kit';
import BreadCrumbs from './BreadCrumbs';

export default function PostBody({
  children,
  cover,
  breadcrumbs,
  title,
  date,
  tags,
  readingTime,
}: PostBodyProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className='flex flex-col gap-6'>
      <BreadCrumbs items={breadcrumbs} />

      {/* Hero: title + cover image side by side on desktop */}
      <div className='flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10'>
        <Heading variant='detail' className='lg:flex-1 lg:min-w-0'>
          {title}
        </Heading>
        <div className='lg:flex-1 lg:min-w-0'>
          <Image
            src={cover.src}
            alt={cover.alt}
            width={512}
            height={288}
            priority
            sizes='(max-width: 1024px) calc(100vw - 2rem), 480px'
            className='w-full h-auto object-cover rounded-lg'
          />
        </div>
      </div>

      {/* Mobile TOC (fixed FAB + bottom sheet — must be outside hidden container) */}
      <TableOfContents mobile />

      {/* Two-column: TOC sidebar | content */}
      <div className='flex gap-10'>
        {/* Left column: sticky TOC (desktop only) */}
        <div className='hidden relative lg:flex flex-col gap-6 w-48 shrink-0'>
          <TableOfContents desktop />
        </div>

        {/* Right column: metadata + article */}
        <div className='flex-1 min-w-0'>
          {/* Date, tags, reading time */}
          <div className='grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 mb-8 text-sm'>
            <Calendar
              className='h-4 w-4 text-text-tertiary'
              aria-hidden='true'
            />
            <span className='text-text-secondary'>{formattedDate}</span>
            <Clock className='h-4 w-4 text-text-tertiary' aria-hidden='true' />
            <span className='text-text-tertiary'>{readingTime} min read</span>
            {tags.length > 0 && (
              <>
                <Tag
                  className='h-4 w-4 text-text-tertiary'
                  aria-hidden='true'
                />
                <span className='text-text-tertiary italic'>
                  {tags.join(', ')}
                </span>
              </>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
