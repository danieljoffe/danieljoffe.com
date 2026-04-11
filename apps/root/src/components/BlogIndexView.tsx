import { PenLine } from 'lucide-react';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe.com/shared-ui/StructuredData';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { blogRootStructuredData } from '@/data/structuredData/blog';
import { getContentByType } from '@/data/contentRegistry';
import { getPaginatedContent } from '@/lib/pagination';
import { getTopTags, tagToSlug } from '@/lib/tags';
import { BLOG_LINK, BLOG_TAGS_LINK, POSTS_PER_PAGE } from '@/utils/constants';
import type { PostThumbnail } from '@/types/postTypes';
import { TagChipStrip } from '@/components/kit';
import { BlogSearchAndList } from './BlogSearchAndList';

const TOP_TAG_LIMIT = 8;

interface BlogIndexViewProps {
  currentPage: number;
}

function toThumbnail(entry: {
  thumbnail: PostThumbnail;
  readingTime: number;
}): PostThumbnail {
  return { ...entry.thumbnail, readingTime: entry.readingTime };
}

/**
 * Shared view component for the blog index. Rendered by both `/blog`
 * (page 1) and `/blog/page/[page]` (pages 2..N) so both routes share an
 * identical layout + data flow.
 */
export function BlogIndexView({ currentPage }: BlogIndexViewProps) {
  const { items, totalPages } = getPaginatedContent(
    'blog',
    currentPage,
    POSTS_PER_PAGE
  );
  const pagePosts = items.map(toThumbnail);
  const allPosts = getContentByType('blog').slice().reverse().map(toThumbnail);

  const topTags = getTopTags('blog', TOP_TAG_LIMIT).map(tag => ({
    ...tag,
    href: `${BLOG_TAGS_LINK.href}/${tagToSlug(tag.name)}`,
  }));

  return (
    <PageLayout>
      <Section>
        <div className='text-center space-y-4'>
          <Heading variant='hero'>Notes from shipping code</Heading>
          <Text variant='subtitle' className='max-w-xl mx-auto'>
            Deep-dives on the problems I&apos;ve debugged, the patterns
            I&apos;ve extracted, and the decisions I&apos;d make differently
            next time.
          </Text>
        </div>
      </Section>

      <Section>
        <SectionLabel
          icon={<PenLine className='h-3.5 w-3.5' />}
          label='Posts'
        />
        <TagChipStrip
          tags={topTags}
          viewAllHref={BLOG_TAGS_LINK.href}
          ariaLabel='Filter blog posts by tag'
          className='mb-6'
        />
        <BlogSearchAndList
          pagePosts={pagePosts}
          allPosts={allPosts}
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={BLOG_LINK.href}
        />
      </Section>

      <StructuredData data={blogRootStructuredData} />
    </PageLayout>
  );
}
