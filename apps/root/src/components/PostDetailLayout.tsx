import PostBody from '@/components/PostBody';
import { PostPagination } from '@/components/kit';
import { type PostDetailProps } from '@/lib/getPostDetailProps';

/**
 * Shared layout for all content detail pages (projects, experience, blog).
 * Renders the PostBody (breadcrumbs + cover image), article content with
 * reading time, pagination, and structured data JSON-LD.
 */
export default function PostDetailLayout({
  entry,
  pagination,
  breadcrumbs,
}: PostDetailProps) {
  const Post = entry.component;

  return (
    <section className='w-full overflow-hidden flex flex-col justify-center'>
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <PostBody
          // TODO: Replace with actual data when it's available
          cover={entry.thumbnail.cover}
          breadcrumbs={breadcrumbs}
          date=''
          readingTime={entry.readingTime}
          tags={[]}
          title=''
        >
          <article className='max-w-3xl mx-auto py-10 lg:py-16'>
            <div className='flex items-center gap-1.5 text-xs text-text-tertiary mb-6'>
              <span>{entry.readingTime} min read</span>
            </div>
            <Post />
          </article>
          <PostPagination pagination={pagination} />
        </PostBody>
      </div>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(entry.structuredData).replace(/</g, '\\u003c'),
        }}
      />
    </section>
  );
}
