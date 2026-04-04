import { Metadata } from 'next';
import { PenLine } from 'lucide-react';
import { blogRecords } from '@/data/blogThumbnails';
import { blogReadingTimes } from '@/data/readingTimes';
import { blogRootMetadata } from '@/data/metadata/blog';
import { blogRootStructuredData } from '@/data/structuredData/blog';
import { AllowedBlogSlugs } from '@/types/base';
import {
  Section,
  SectionLabel,
  PageLayout,
  PostCard,
  StructuredData,
} from '@/components/kit';

const blogList = Object.values(blogRecords)
  .reverse()
  .map(post => ({
    ...post,
    readingTime: blogReadingTimes[post.slug as AllowedBlogSlugs],
  }));

export const metadata: Metadata = blogRootMetadata;

export default function Blog() {
  return (
    <PageLayout>
      <Section>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Blog
          </h1>
          <p className='text-lg text-text-secondary max-w-xl mx-auto'>
            Technical deep-dives, opinions on frontend trends, tutorials, and
            lessons learned.
          </p>
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
