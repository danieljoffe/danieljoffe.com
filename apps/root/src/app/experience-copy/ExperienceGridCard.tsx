'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Calendar } from 'lucide-react';
import { UnsplashImg } from '@/components/UnsplashImage';
import { analytics } from '@/lib/analytics';
import { PostThumbnail } from '@/types/postTypes';

export default function ExperienceGridCard({
  exp,
  logo,
  priority,
}: {
  exp: PostThumbnail;
  logo?: string | undefined;
  priority: boolean;
}) {
  return (
    <Link
      href={exp.link.href}
      onClick={() => analytics.experienceClick(exp.slug)}
      className='group relative overflow-hidden rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      {/* Cover image */}
      <div className='relative h-36 overflow-hidden'>
        <UnsplashImg
          src={exp.cover.src}
          alt={exp.cover.alt}
          fill
          sizes='(max-width: 640px) 100vw, 50vw'
          priority={priority}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
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

      {/* Content */}
      <div className='p-4 space-y-2'>
        <div className='flex items-start justify-between gap-2'>
          <p className='text-sm font-semibold text-text-primary'>{exp.title}</p>
          <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
        </div>
        {exp.role && (
          <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium'>
            {exp.role}
          </span>
        )}
        <p className='text-sm text-text-secondary leading-relaxed line-clamp-2'>
          {exp.description}
        </p>
        {exp.duration && (
          <div className='flex items-center gap-1.5'>
            <Calendar className='h-3 w-3 text-text-tertiary' />
            <span className='text-xs text-text-tertiary'>{exp.duration}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
