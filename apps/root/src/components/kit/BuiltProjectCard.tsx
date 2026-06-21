import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@danieljoffe/shared-ui/Badge';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import { CardSpotlight } from '@/components/CardSpotlight';
import { CoverImage } from './CoverImage';

export interface BuiltProject {
  title: string;
  description: string;
  href: string;
  label: string;
  cover: { src: string; alt: string };
}

export function BuiltProjectCard({ project }: { project: BuiltProject }) {
  return (
    <a
      href={project.href}
      target='_blank'
      rel='noopener noreferrer'
      className='group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-secondary transition-all duration-200 hover:border-brand-500/40 hover:shadow-lg/5'
    >
      <div className='relative'>
        <CoverImage src={project.cover.src} alt={project.cover.alt} />
      </div>

      <div className='flex flex-1 flex-col p-4'>
        <div className='space-y-2'>
          <div className='flex items-start justify-between gap-2'>
            <Heading
              variant='cardTitle'
              as='p'
              className='line-clamp-2 min-h-[2.5rem]'
            >
              {project.title}
            </Heading>
            <ArrowUpRight className='h-4 w-4 text-text-tertiary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
          </div>
          <Badge variant='brand'>{project.label}</Badge>
          <Text variant='cardDescription' className='line-clamp-2'>
            {project.description}
          </Text>
        </div>
      </div>
      <CardSpotlight />
    </a>
  );
}
