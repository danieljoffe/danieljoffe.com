import { Metadata } from 'next';
import { PenLine } from 'lucide-react';
import { getContentByType } from '@/data/contentRegistry';
import { blogRootMetadata } from '@/data/metadata/blog';
import { blogRootStructuredData } from '@/data/structuredData/blog';
import { PageContainer } from '@danieljoffe.com/shared-ui/PageContainer';
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
    <PageContainer
      as='main'
      id='main-content'
      className='py-16 lg:py-24 space-y-24'
    >
      <section className='relative px-6 lg:px-0'>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Blog
          </h1>
          <p className='text-lg text-text-secondary max-w-xl mx-auto'>
            Technical deep-dives, opinions on frontend trends, tutorials, and
            lessons learned.
          </p>
        </div>
      </section>

      <section className='relative px-6 lg:px-0'>
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
      </section>

      <StructuredData data={blogRootStructuredData} />
    </PageContainer>
  );
}
