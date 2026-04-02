import { PostBodyProps } from '@/types/postTypes';
import UnsplashImage from './UnsplashImage';
import BreadCrumbs from './BreadCrumbs';
import { TableOfContents } from '@/components/kit';
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';

export default function PostBody({
  children,
  cover,
  breadcrumbs,
  title,
  date,
  tags,
  readingTime,
  backLink,
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
        <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary tracking-tight lg:flex-1 lg:min-w-0'>
          {title}
        </h1>
        <div className='lg:flex-1 lg:min-w-0'>
          <UnsplashImage
            src={cover.src}
            alt={cover.alt}
            origin={cover.origin}
            creator={cover.creator}
            blurHash={cover.blurHash}
            width={512}
            height={288}
            preload={true}
            sizes='(max-width: 1024px) calc(100vw - 2rem), 480px'
          />
        </div>
      </div>

      {/* Two-column: TOC sidebar | content */}
      <div className='flex gap-10'>
        {/* Left column: back link + sticky TOC (desktop only) */}
        <div className='hidden lg:flex flex-col gap-6 w-48 shrink-0'>
          <Button
            as='link'
            variant='bare'
            size='sm'
            href={backLink.href}
            name={`back-to-${backLink.label.toLowerCase()}`}
          >
            <ArrowLeft className='size-3.5' aria-hidden='true' />
            {backLink.label}
          </Button>
          {/* Renders desktop sticky sidebar + mobile FAB (position:fixed) */}
          <TableOfContents />
        </div>

        {/* Right column: metadata + article */}
        <div className='flex-1 min-w-0'>
          {/* Date, tags, reading time */}
          <div className='flex flex-col gap-1 mb-8'>
            <span className='text-sm text-text-secondary'>{formattedDate}</span>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-text-tertiary'>
                {readingTime} min read
              </span>
              {tags.length > 0 && (
                <div className='flex items-center gap-2'>
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className='text-xs text-text-tertiary italic'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
