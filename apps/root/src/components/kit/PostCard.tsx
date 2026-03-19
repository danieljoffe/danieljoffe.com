'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Calendar } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { PostThumbnail } from '@/types/postTypes';
import { CoverImage } from './CoverImage';

export function PostCard({
  post,
  logo,
  priority = false,
  analyticsType = 'project',
}: {
  post: PostThumbnail;
  logo?: string | undefined;
  priority?: boolean;
  analyticsType?: 'project' | 'experience';
}) {
  const handleClick = () => {
    if (analyticsType === 'experience') {
      analytics.experienceClick(post.slug);
    } else {
      analytics.projectClick(post.slug);
    }
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
            <div className='h-8 w-8 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center p-1.5'>
              <Image
                src={logo}
                alt=''
                width={20}
                height={20}
                className='object-contain'
              />
            </div>
          </div>
        )}
      </div>

      <div className='p-4 space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <p className='text-sm font-semibold text-text-primary'>
            {post.title}
          </p>
          <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
        </div>
        {post.role && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium'>
            {post.role}
          </span>
        )}
        <p className='text-sm text-text-secondary leading-relaxed line-clamp-2'>
          {post.description}
        </p>
        {post.duration && (
          <div className='flex items-center gap-1.5'>
            <Calendar className='h-3 w-3 text-text-tertiary' />
            <span className='text-xs text-text-tertiary'>{post.duration}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
