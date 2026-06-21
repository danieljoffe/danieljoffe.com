import { Metadata } from 'next';
import { FolderOpen, Code } from 'lucide-react';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe/shared-ui/StructuredData';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import { builtProjects } from '@/data/builtProjects';
import { getContentByType } from '@/data/contentRegistry';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import { getTopTags, tagToSlug } from '@/lib/tags';
import { PROJECTS_TAGS_LINK } from '@/utils/constants';
import { BuiltProjectCard } from '@/components/kit';
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
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section padding='none' contain='lg' className='py-8 md:py-12'>
        <div className='text-center space-y-4'>
          <Heading variant='hero'>Case studies from the field</Heading>
          <Text variant='subtitle' className='max-w-xl mx-auto'>
            The problems I&apos;ve solved and how I solved them. Every study has
            the challenge, the approach, and the measurable outcome.
          </Text>
        </div>
      </Section>

      {/* ══════════════════════════════════
          THINGS I'VE BUILT
          ══════════════════════════════════ */}
      <Section padding='none' contain='lg'>
        <SectionLabel
          icon={<Code className='h-3.5 w-3.5' />}
          label="Things I've built"
        />
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {builtProjects.map(project => (
            <BuiltProjectCard key={project.href} project={project} />
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          PROJECT GRID
          ══════════════════════════════════ */}
      <Section padding='none' contain='lg'>
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
