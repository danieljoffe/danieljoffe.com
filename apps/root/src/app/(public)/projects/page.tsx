import { Metadata } from 'next';
import { FolderOpen, Github, BookOpen, Code } from 'lucide-react';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe/shared-ui/StructuredData';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import { getContentByType } from '@/data/contentRegistry';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import { getTopTags, tagToSlug } from '@/lib/tags';
import {
  GITHUB_REPO_URL,
  PROJECTS_TAGS_LINK,
  STORYBOOK_URL,
} from '@/utils/constants';
import { cardBase } from '@/lib/layoutStyles';
import Button from '@/components/Button';
import { ProjectsGridWithTags } from '@/components/ProjectsGridWithTags';

const projectsList = getContentByType('project')
  .reverse()
  .map(entry => ({
    ...entry.thumbnail,
    readingTime: entry.readingTime,
  }));

const TOP_TAG_LIMIT = 8;
const topProjectTags = getTopTags('project', TOP_TAG_LIMIT).map(tag => ({
  ...tag,
  href: `${PROJECTS_TAGS_LINK.href}/${tagToSlug(tag.name)}`,
}));

export const metadata: Metadata = projectRootMetadata;

export default function Projects() {
  return (
    <PageLayout wide>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section padding='none'>
        <div className='text-center space-y-4'>
          <Heading variant='hero'>Case studies from the field</Heading>
          <Text variant='subtitle' className='max-w-xl mx-auto'>
            The problems I&apos;ve solved and how I solved them. Every study has
            the challenge, the approach, and the measurable outcome.
          </Text>
        </div>
      </Section>

      {/* ══════════════════════════════════
          OPEN SOURCE CALLOUT
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<Code className='h-3.5 w-3.5' />}
          label='Open Source'
        />
        <div className={`${cardBase} p-5 space-y-3`}>
          <Text variant='body'>
            The source for this site and its design system is public. Read the
            code on GitHub or browse the components in Storybook.
          </Text>
          <div className='flex flex-wrap gap-2'>
            <Button
              as='link'
              href={GITHUB_REPO_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='View source code on GitHub'
              variant='secondary'
              size='sm'
            >
              <Github className='h-3.5 w-3.5' aria-hidden='true' />
              View on GitHub
            </Button>
            <Button
              as='link'
              href={STORYBOOK_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Browse UI component library on Storybook'
              variant='secondary'
              size='sm'
            >
              <BookOpen className='h-3.5 w-3.5' aria-hidden='true' />
              Open Storybook
            </Button>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          PROJECT GRID
          ══════════════════════════════════ */}
      <Section padding='none'>
        <SectionLabel
          icon={<FolderOpen className='h-3.5 w-3.5' />}
          label='Case Studies'
        />
        <ProjectsGridWithTags
          allProjects={projectsList}
          tags={topProjectTags}
          viewAllTagsHref={PROJECTS_TAGS_LINK.href}
        />
      </Section>

      <StructuredData data={projectsRootStructuredData} />
    </PageLayout>
  );
}
