'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { UnsplashImg } from '@/components/UnsplashImage';
import { analytics } from '@/lib/analytics';
import { PostThumbnail } from '@/types/postTypes';

export default function ProjectCard({
  project,
  priority,
}: {
  project: PostThumbnail;
  priority: boolean;
}) {
  return (
    <Link
      href={project.link.href}
      onClick={() => analytics.projectClick(project.slug)}
      className='group relative overflow-hidden rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      {/* Cover image */}
      <div className='relative h-36 overflow-hidden'>
        <UnsplashImg
          src={project.cover.src}
          alt={project.cover.alt}
          fill
          sizes='(max-width: 640px) 100vw, 50vw'
          priority={priority}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
      </div>

      {/* Content */}
      <div className='p-4 space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <p className='text-sm font-semibold text-text-primary'>
            {project.title}
          </p>
          <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
        </div>
        <p className='text-sm text-text-secondary leading-relaxed line-clamp-2'>
          {project.description}
        </p>
      </div>
    </Link>
  );
}
