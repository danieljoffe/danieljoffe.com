'use client';

import { type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { IconText } from '@danieljoffe/shared-ui/IconText';
import { Text } from '@danieljoffe/shared-ui/Text';
import { analytics } from '@/lib/analytics';
import { ContentType, PostThumbnail } from '@/types/postTypes';
import { useViewTransitionNavigate } from '@/components/ViewTransitions';
import { CardSpotlight } from '@/components/CardSpotlight';
import { CoverImage } from './CoverImage';
import { CompanyLogo } from './CompanyLogo';

const analyticsHandlers: Record<ContentType, (slug: string) => void> = {
  project: analytics.projectClick,
  experience: analytics.experienceClick,
  blog: analytics.blogClick,
};

export function PostCard({
  post,
  logo,
  priority = false,
  analyticsType = 'project',
}: {
  post: PostThumbnail;
  logo?: string | undefined;
  priority?: boolean;
  analyticsType?: ContentType;
}) {
  const navigate = useViewTransitionNavigate();
  const coverName = `cover-${analyticsType}-${post.slug}`;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    analyticsHandlers[analyticsType](post.slug);
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
    // Name the clicked cover so it — and only it — morphs into the detail
    // hero that carries the matching `view-transition-name`.
    const cover =
      event.currentTarget.querySelector<HTMLElement>('[data-cover-name]');
    if (cover) {
      cover.style.viewTransitionName = coverName;
    }
    navigate(post.link.href);
  };

  return (
    <Link
      href={post.link.href}
      onClick={handleClick}
      className='group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      <div className='relative'>
        <CoverImage
          src={post.cover.src}
          alt={post.cover.alt}
          priority={priority}
          coverName={coverName}
        />
        {logo && (
          <div className='absolute bottom-3 left-3'>
            <CompanyLogo src={logo} alt='' size='sm' />
          </div>
        )}
      </div>

      <div className='flex flex-1 flex-col p-4'>
        <div className='space-y-2'>
          <div className='flex items-start justify-between gap-2'>
            <Heading
              variant='cardTitle'
              as='p'
              className='line-clamp-2 min-h-[2.5rem]'
            >
              {post.title}
            </Heading>
            <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
          </div>
          {post.role && <Badge variant='brand'>{post.role}</Badge>}
          <Text variant='cardDescription' className='line-clamp-2'>
            {post.description}
          </Text>
        </div>
        {post.readingTime && (
          <IconText
            icon={<Clock className='h-3 w-3 text-text-tertiary' />}
            className='mt-auto pt-3 gap-x-1.5'
          >
            <Text variant='meta' as='span'>
              {post.readingTime} min read
            </Text>
          </IconText>
        )}
      </div>
      <CardSpotlight />
    </Link>
  );
}
