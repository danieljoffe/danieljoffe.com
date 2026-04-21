import { Metadata } from 'next';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { getAllTags, getTagCounts, tagToSlug } from '@/lib/tags';
import Button from '@/components/Button';

export const metadata: Metadata = {
  title: 'Tags | Projects',
  description: 'Browse project case studies by topic',
};

export default function ProjectTagsIndexPage() {
  const allTags = getAllTags('project');
  const tagCounts = getTagCounts('project');

  return (
    <PageLayout>
      <Section padding='none'>
        <Button as='link' variant='bare' size='sm' href='/projects'>
          ← Back to Projects
        </Button>
      </Section>

      <Section padding='none'>
        <Heading as='h1' variant='hero'>
          Project Topics
        </Heading>
        <Text as='p' variant='body'>
          Browse case studies by tag — {allTags.length}{' '}
          {allTags.length === 1 ? 'topic' : 'topics'} in total
        </Text>
      </Section>

      <Section padding='none'>
        <div className='flex flex-wrap gap-3'>
          {allTags.map(tag => {
            const count = tagCounts.get(tag) || 0;
            return (
              <Button
                key={tag}
                as='link'
                variant='outline'
                size='sm'
                href={`/projects/tags/${tagToSlug(tag)}`}
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
