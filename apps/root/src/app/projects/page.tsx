import { Metadata } from 'next';
import { FolderOpen, Github, BookOpen, Code } from 'lucide-react';
import { getContentByType } from '@/data/contentRegistry';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import { GITHUB_REPO_URL, STORYBOOK_URL } from '@/utils/constants';
import { PageContainer } from '@danieljoffe.com/shared-ui/PageContainer';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe.com/shared-ui/StructuredData';
import { PostCard } from '@/components/kit';
import { cardBase } from '@/lib/layoutStyles';

const projectsList = getContentByType('project')
  .reverse()
  .map(entry => ({
    ...entry.thumbnail,
    readingTime: entry.readingTime,
  }));
export const metadata: Metadata = projectRootMetadata;

export default function Projects() {
  return (
    <PageContainer
      as='main'
      id='main-content'
      size='md'
      className='py-16 lg:py-24 space-y-24'
    >
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <section className='relative px-6 lg:px-0'>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Projects
          </h1>
          <p className='text-lg text-text-secondary max-w-xl mx-auto'>
            Case studies and projects spanning full-stack development, backend
            architecture, and frontend systems. Each project includes the
            challenge, my approach, and measurable outcomes.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════
          OPEN SOURCE CALLOUT
          ══════════════════════════════════ */}
      <section className='relative px-6 lg:px-0'>
        <SectionLabel
          icon={<Code className='h-3.5 w-3.5' />}
          label='Open Source'
        />
        <div className={`${cardBase} p-5 space-y-3`}>
          <p className='text-sm text-text-secondary'>
            Explore the source code or browse the component library.
          </p>
          <div className='flex flex-wrap gap-2'>
            <a
              href={GITHUB_REPO_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='View source code on GitHub'
              className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-sm text-text-primary hover:bg-surface-tertiary transition-colors'
            >
              <Github className='h-3.5 w-3.5' aria-hidden='true' />
              View Source
            </a>
            <a
              href={STORYBOOK_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Browse UI component library on Storybook'
              className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-sm text-text-primary hover:bg-surface-tertiary transition-colors'
            >
              <BookOpen className='h-3.5 w-3.5' aria-hidden='true' />
              Component Library
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          PROJECT GRID
          ══════════════════════════════════ */}
      <section className='relative px-6 lg:px-0'>
        <SectionLabel
          icon={<FolderOpen className='h-3.5 w-3.5' />}
          label='Case Studies'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {projectsList.map((project, i) => (
            <PostCard key={project.slug} post={project} priority={i < 3} />
          ))}
        </div>
      </section>

      <StructuredData data={projectsRootStructuredData} />
    </PageContainer>
  );
}
