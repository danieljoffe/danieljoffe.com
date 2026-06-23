import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FolderOpen } from 'lucide-react';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { SectionLabel } from '@danieljoffe/shared-ui/SectionLabel';
import { Text } from '@danieljoffe/shared-ui/Text';
import { getContentByType } from '@/data/contentRegistry';
import { getAllTags, slugToTag, tagToSlug } from '@/lib/tags';
import BreadCrumbs from '@/components/BreadCrumbs';
import { PostCard } from '@/components/kit';
import { PROJECTS_LINK, PROJECTS_TAGS_LINK } from '@/utils/constants';
import type { PostThumbnail } from '@/types/postTypes';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags('project').map(tag => ({ tag: tagToSlug(tag) }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags('project');
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) return { title: 'Tag Not Found' };
  const count = getContentByType('project').filter(entry =>
    entry.metadata.tags.includes(tagName)
  ).length;
  return {
    title: `${tagName} | Project Tag`,
    description: `${count} case ${count === 1 ? 'study' : 'studies'} tagged with "${tagName}"`,
  };
}

function toThumbnail(entry: {
  thumbnail: PostThumbnail;
  readingTime: number;
}): PostThumbnail {
  return { ...entry.thumbnail, readingTime: entry.readingTime };
}

export default async function ProjectTagDetailPage({ params }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags('project');
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) notFound();

  const projects = getContentByType('project')
    .filter(entry => entry.metadata.tags.includes(tagName))
    .slice()
    .reverse()
    .map(toThumbnail);

  return (
    <PageLayout>
      <Section padding='none' contain='lg' className='py-8 md:py-12'>
        <BreadCrumbs
          items={[
            PROJECTS_LINK,
            PROJECTS_TAGS_LINK,
            { label: tagName, href: `/projects/tags/${tagSlug}` },
          ]}
        />
      </Section>

      <Section padding='none' contain='lg'>
        <Heading as='h1' variant='hero'>
          Tag: {tagName}
        </Heading>
        <Text as='p' variant='body'>
          {projects.length}{' '}
          {projects.length === 1 ? 'case study' : 'case studies'}
        </Text>
      </Section>

      <Section padding='none' contain='lg'>
        <SectionLabel
          icon={<FolderOpen className='h-3.5 w-3.5' />}
          label='Case Studies'
        />
        {projects.length === 0 ? (
          <Text as='p' variant='body'>
            No case studies tagged with {tagName} yet.
          </Text>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {projects.map((project, i) => (
              <PostCard
                key={project.slug}
                post={project}
                priority={i < 3}
                analyticsType='project'
              />
            ))}
          </div>
        )}
      </Section>
    </PageLayout>
  );
}
