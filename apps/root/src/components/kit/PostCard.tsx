'use client';

import Link from 'next/link';
import { ArrowUpRight, Calendar, Clock } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { Badge } from '@danieljoffe.com/shared-ui';
import { ContentType, PostThumbnail } from '@/types/postTypes';
import { CoverImage } from './CoverImage';
import { CompanyLogo } from './CompanyLogo';
import { Heading } from './Heading';
import { Text } from './Text';

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
  const handleClick = () => {
    analyticsHandlers[analyticsType](post.slug);
  };

  return (
    <Link
      href={post.link.href}
      onClick={handleClick}
      className='group relative overflow-hidden rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      <div className='relative'>
        <CoverImage
          src={post.cover.src}
          alt={post.cover.alt}
          priority={priority}
        />
        {logo && (
          <div className='absolute bottom-3 left-3'>
            <CompanyLogo src={logo} alt='' size='sm' />
          </div>
        )}
      </div>

      <div className='p-4 space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <Heading variant='cardTitle' as='p'>
            {post.title}
          </Heading>
          <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
        </div>
        {post.role && <Badge variant='brand'>{post.role}</Badge>}
        <Text variant='cardDescription' className='line-clamp-2'>
          {post.description}
        </Text>
        {(post.duration || post.readingTime) && (
          <div className='flex items-center gap-3'>
            {post.duration && (
              <div className='flex items-center gap-1.5'>
                <Calendar className='h-3 w-3 text-text-tertiary' />
                <span className='text-xs text-text-tertiary'>
                  {post.duration}
                </span>
              </div>
            )}
            {post.readingTime && (
              <div className='flex items-center gap-1.5'>
                <Clock className='h-3 w-3 text-text-tertiary' />
                <span className='text-xs text-text-tertiary'>
                  {post.readingTime} min read
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
