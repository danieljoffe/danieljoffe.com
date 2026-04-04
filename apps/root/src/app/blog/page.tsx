import { Metadata } from 'next';
import { PenLine } from 'lucide-react';
import { getContentByType } from '@/data/contentRegistry';
import { blogRootMetadata } from '@/data/metadata/blog';
import { blogRootStructuredData } from '@/data/structuredData/blog';
import {
  Section,
  SectionLabel,
  PageLayout,
  PostCard,
  StructuredData,
  Heading,
  Text,
} from '@/components/kit';

const blogList = getContentByType('blog')
  .reverse()
  .map(entry => ({
    ...entry.thumbnail,
    readingTime: entry.readingTime,
  }));

export const metadata: Metadata = blogRootMetadata;

export default function Blog() {
  return (
    <PageLayout>
      <Section>
        <div className='text-center space-y-4'>
          <Heading variant='hero'>Blog</Heading>
          <Text variant='subtitle' className='max-w-xl mx-auto'>
            Technical deep-dives, opinions on frontend trends, tutorials, and
            lessons learned.
          </Text>
        </div>
      </Section>

      <Section>
        <SectionLabel
          icon={<PenLine className='h-3.5 w-3.5' />}
          label='Posts'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {blogList.map((post, i) => (
            <PostCard
              key={post.slug}
              post={post}
              priority={i < 2}
              analyticsType='blog'
            />
          ))}
        </div>
      </Section>

      <StructuredData data={blogRootStructuredData} />
    </PageLayout>
  );
}
