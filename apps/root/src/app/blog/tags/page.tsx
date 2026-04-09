import { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { getAllTags, getTagCounts } from '@/lib/tags';
import Button from '@/components/Button';

export const metadata: Metadata = {
  title: 'Tags | Blog',
  description: 'Browse blog posts by topic',
};

export default function TagsIndexPage() {
  const allTags = getAllTags();
  const tagCounts = getTagCounts();

  return (
    <PageLayout>
      <Section>
        <Button as='link' variant='bare' size='sm' href={'/blog'}>
          ← Back to Blog
        </Button>
      </Section>

      <Section>
        <Heading as='h1' variant='hero'>
          All Topics
        </Heading>

        <Text as='p' variant='body'>
          Browse posts by tag — {allTags.length} topics in total
        </Text>
      </Section>

      <Section>
        <div className='flex flex-wrap gap-3'>
          {allTags.map(tag => {
            const count = tagCounts.get(tag) || 0;
            const slug = encodeURIComponent(
              tag.toLowerCase().replace(/\s+/g, '-')
            );
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
