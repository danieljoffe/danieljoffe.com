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
  coverTransitionName,
}: PostDetailProps) {
  const Post = entry.component;

  return (
    <main
      id='main-content'
      tabIndex={-1}
      // scroll-mt keeps the post-navigation focus-scroll of this landmark at
      // the top instead of scrolling the static nav off-screen.
      className='w-full flex flex-col justify-center scroll-mt-16'
    >
      <div className='max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <PostBody
          cover={entry.thumbnail.cover}
          coverTransitionName={coverTransitionName}
          breadcrumbs={breadcrumbs}
          title={entry.metadata.title}
          date={entry.metadata.date}
          tags={entry.metadata.tags}
          readingTime={entry.readingTime}
        >
          <article>
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
    </main>
  );
}
