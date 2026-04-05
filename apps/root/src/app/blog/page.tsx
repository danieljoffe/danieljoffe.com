import { Metadata } from 'next';
import { PenLine } from 'lucide-react';
import { getContentByType } from '@/data/contentRegistry';
import { blogRootMetadata } from '@/data/metadata/blog';
import { blogRootStructuredData } from '@/data/structuredData/blog';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe.com/shared-ui/StructuredData';
import { PostCard } from '@/components/kit';

const blogList = getContentByType('blog')
  .reverse()
  .map(entry => ({
    ...entry.thumbnail,
    readingTime: entry.readingTime,
  }));

export const metadata: Metadata = blogRootMetadata;

export default function Blog() {
  return (
    <PageLayout className='py-16 lg:py-24 space-y-24'>
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
