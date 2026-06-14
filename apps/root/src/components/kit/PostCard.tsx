'use client';

import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { IconText } from '@danieljoffe/shared-ui/IconText';
import { Text } from '@danieljoffe/shared-ui/Text';
import { analytics } from '@/lib/analytics';
import { ContentType, PostThumbnail } from '@/types/postTypes';
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
        {post.readingTime && (
          <IconText
            icon={<Clock className='h-3 w-3 text-text-tertiary' />}
            className='gap-x-1.5'
          >
            <Text variant='meta' as='span'>
              {post.readingTime} min read
            </Text>
          </IconText>
        )}
      </div>
    </Link>
  );
}
