import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Grid, GridItem } from '@danieljoffe.com/shared-ui/Grid';
import { getAllTags, getContentByTag, slugToTag } from '@/lib/tags';
import BreadCrumbs from '@/components/BreadCrumbs';
import { BLOG_LINK, BLOG_TAGS_LINK } from '@/utils/constants';

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const allTags = getAllTags();
  return allTags.map(tag => ({
    tag: encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-')),
  }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags();
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) return { title: 'Tag Not Found' };
  const content = getContentByTag(tagName);
  return {
    title: `${tagName} | Blog Tag`,
    description: `${content.length} post${content.length === 1 ? '' : 's'} tagged with &quot;${tagName}&quot;`,
  };
}

export default async function TagDetailPage({ params }: TagPageProps) {
  const { tag: tagSlug } = await params;
  const allTags = getAllTags();
  const tagName = slugToTag(tagSlug, allTags);
  if (!tagName) notFound();
  const content = getContentByTag(tagName);

  return (
    <PageLayout>
      <Section>
        <BreadCrumbs
          items={[
            BLOG_LINK,
            BLOG_TAGS_LINK,
            { label: tagName, href: `/blog/tags/${tagSlug}` },
          ]}
        />
      </Section>

      <Section>
        <Heading as='h1' variant='hero'>
          Tag: {tagName}
        </Heading>
        <Text as='p' variant='body'>
          Total — {content.length} {content.length === 1 ? 'post' : 'posts'}
        </Text>
      </Section>

      <Section>
        <Grid cols={1} gap='lg' as='div'>
          {content.map(post => (
            <GridItem colSpan={1} key={post.slug}>
              <article key={post.slug}>
                <Link href={post.url} className='hover:underline'>
                  <Heading as='h2' variant='subtitle'>
                    {post.title}
                  </Heading>
                </Link>

                <Text as='p' variant='body'>
                  {post.excerpt}
                </Text>

                <div className='flex items-center gap-2 text-sm'>
                  <span className='text-gray-500 capitalize'>{post.type}</span>
                  <span className='text-gray-300'>•</span>
                  <Link
                    href='/blog/tags'
                    className='text-blue-600 hover:underline'
                  >
                    View all tags →
                  </Link>
                </div>
              </article>
            </GridItem>
          ))}
        </Grid>
      </Section>
    </PageLayout>
  );
}
