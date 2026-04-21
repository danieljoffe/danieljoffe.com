import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { PenLine } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { getContentByType } from '@/data/contentRegistry';
import { getAllTags, slugToTag, tagToSlug } from '@/lib/tags';
import BreadCrumbs from '@/components/BreadCrumbs';
import { PostCard } from '@/components/kit';
import { BLOG_LINK, BLOG_TAGS_LINK } from '@/utils/constants';
import type { PostThumbnail } from '@/types/postTypes';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  return getAllTags('blog').map(tag => ({ tag: tagToSlug(tag) }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags('blog');
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) return { title: 'Tag Not Found' };
  const count = getContentByType('blog').filter(entry =>
    entry.metadata.tags.includes(tagName)
  ).length;
  return {
    title: `${tagName} | Blog Tag`,
    description: `${count} ${count === 1 ? 'post' : 'posts'} tagged with "${tagName}"`,
  };
}

function toThumbnail(entry: {
  thumbnail: PostThumbnail;
  readingTime: number;
}): PostThumbnail {
  return { ...entry.thumbnail, readingTime: entry.readingTime };
}

export default async function TagDetailPage({ params }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags('blog');
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) notFound();

  const posts = getContentByType('blog')
    .filter(entry => entry.metadata.tags.includes(tagName))
    .slice()
    .reverse()
    .map(toThumbnail);

  return (
    <PageLayout>
      <Section padding='none'>
        <BreadCrumbs
          items={[
            BLOG_LINK,
            BLOG_TAGS_LINK,
            { label: tagName, href: `/blog/tags/${tagSlug}` },
          ]}
        />
      </Section>

      <Section padding='none'>
        <Heading as='h1' variant='hero'>
          Tag: {tagName}
        </Heading>
        <Text as='p' variant='body'>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </Text>
      </Section>

      <Section padding='none'>
        <SectionLabel
          icon={<PenLine className='h-3.5 w-3.5' />}
          label='Posts'
        />
        {posts.length === 0 ? (
          <Text as='p' variant='body'>
            No posts tagged with {tagName} yet.
          </Text>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {posts.map((post, i) => (
              <PostCard
                key={post.slug}
                post={post}
                priority={i < 2}
                analyticsType='blog'
              />
            ))}
          </div>
        )}
      </Section>
    </PageLayout>
  );
}
