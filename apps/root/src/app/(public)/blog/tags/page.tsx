import { Metadata } from 'next';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Section } from '@danieljoffe/shared-ui/Section';
import { getAllTags, getTagCounts, tagToSlug } from '@/lib/tags';
import Button from '@/components/Button';

export const metadata: Metadata = {
  title: 'Tags | Blog',
  description: 'Browse blog posts by topic',
};

export default function TagsIndexPage() {
  const allTags = getAllTags('blog');
  const tagCounts = getTagCounts('blog');

  return (
    <PageLayout>
      <Section padding='none'>
        <Button as='link' variant='bare' size='sm' href={'/blog'}>
          ← Back to Blog
        </Button>
      </Section>

      <Section padding='none'>
        <Heading as='h1' variant='hero'>
          All Topics
        </Heading>

        <Text as='p' variant='body'>
          Browse posts by tag — {allTags.length} topics in total
        </Text>
      </Section>

      <Section padding='none'>
        <div className='flex flex-wrap gap-3'>
          {allTags.map(tag => {
            const count = tagCounts.get(tag) || 0;
            const slug = tagToSlug(tag);
            return (
              <Button
                key={tag}
                href={`/blog/tags/${slug}`}
                as='link'
                variant='outline'
                size='sm'
              >
                {tag}
                <span className='text-gray-500'>({count})</span>
              </Button>
            );
          })}
        </div>
      </Section>
    </PageLayout>
  );
}
