import { Metadata } from 'next';
import { FolderOpen, Github, BookOpen } from 'lucide-react';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import { GITHUB_REPO_URL, STORYBOOK_URL } from '@/utils/constants';
import {
  Section,
  SectionLabel,
  PageLayout,
  PostCard,
  StructuredData,
} from '@/components/kit';
import { cardBase } from '@/lib/layoutStyles';

const projectsList = Object.values(projectsRecords);
export const metadata: Metadata = projectRootMetadata;

export default function Projects() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Projects
          </h1>
          <p className='text-lg text-text-secondary max-w-xl mx-auto'>
            Case studies and projects showcasing performance optimization,
            component architecture, and full-stack development. Each project
            includes the challenge, my approach, and measurable outcomes.
          </p>
        </div>
      </Section>

      {/* ══════════════════════════════════
          OPEN SOURCE CALLOUT
          ══════════════════════════════════ */}
      <Section>
        <div className={`${cardBase} p-5 space-y-3`}>
          <p className='text-sm text-text-primary'>
            This portfolio is open source. Explore the code or browse the
            component library.
          </p>
          <div className='flex flex-wrap gap-2'>
            <a
              href={GITHUB_REPO_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='View source code on GitHub'
              className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-sm text-text-primary hover:bg-surface-tertiary transition-colors'
            >
              <Github className='h-4 w-4' aria-hidden='true' />
              View Source
            </a>
            <a
              href={STORYBOOK_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Browse UI component library on Storybook'
              className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated text-sm text-text-primary hover:bg-surface-tertiary transition-colors'
            >
              <BookOpen className='h-4 w-4' aria-hidden='true' />
              Component Library
            </a>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          PROJECT GRID
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<FolderOpen className='h-3.5 w-3.5' />}
          label='Case Studies'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {projectsList.map((project, i) => (
            <PostCard key={project.slug} post={project} priority={i < 2} />
          ))}
        </div>
      </Section>

      <StructuredData data={projectsRootStructuredData} />
    </PageLayout>
  );
}
