import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';
import { DOMAIN_URL } from '@/utils/constants';
import {
  getAllViolationGuides,
  getViolationGuideBySlug,
  type Difficulty,
} from '../data';
import CodeBlock from './CodeBlock';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllViolationGuides().map(g => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getViolationGuideBySlug(slug);
  if (!guide) return {};

  const title = `How to Fix: ${guide.title} | Audit Insights`;
  const description = `${guide.description.slice(0, 150)}...`;

  return {
    title,
    description,
    alternates: { canonical: `/audit/insights/violations/${slug}` },
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  moderate:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  complex: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  seo: 'SEO',
  ux: 'UX',
};

export default async function ViolationGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getViolationGuideBySlug(slug);

  if (!guide) notFound();

  return (
    <PageLayout>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: `How to Fix: ${guide.title}`,
            description: guide.description,
            step: [
              {
                '@type': 'HowToStep',
                name: 'Understand the issue',
                text: guide.description,
              },
              {
                '@type': 'HowToStep',
                name: 'Apply the fix',
                text: guide.solution,
              },
            ],
            author: {
              '@type': 'Person',
              name: 'Daniel Joffe',
              url: DOMAIN_URL,
            },
          }).replace(/</g, '\\u003c'),
        }}
      />

      <article className='w-full py-16'>
        <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
          {/* Breadcrumb */}
          <nav aria-label='Breadcrumb' className='mb-8'>
            <ol className='flex items-center gap-2 text-sm text-muted'>
              <li>
                <Link
                  href='/audit/insights'
                  className='hover:text-foreground transition-colors'
                >
                  Insights
                </Link>
              </li>
              <li aria-hidden='true'>/</li>
              <li className='text-foreground font-medium truncate'>
                {guide.title}
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header className='mb-10'>
            <div className='flex flex-wrap items-center gap-3 mb-4'>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[guide.difficulty]}`}
              >
                {guide.difficulty}
              </span>
              <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-surface-secondary text-muted'>
                {CATEGORY_LABELS[guide.category]}
              </span>
            </div>
            <Heading variant='hero' as='h1'>
              {guide.title}
            </Heading>
          </header>

          {/* What this means */}
          <section className='mb-10'>
            <Heading variant='section' as='h2' className='mb-3'>
              What this means
            </Heading>
            <Text variant='body'>{guide.description}</Text>
          </section>

          {/* Why it matters */}
          <section className='mb-10'>
            <Heading variant='section' as='h2' className='mb-3'>
              Why it matters
            </Heading>
            <Text variant='body'>{guide.impact}</Text>
          </section>

          {/* How to fix it */}
          <section className='mb-10'>
            <Heading variant='section' as='h2' className='mb-3'>
              How to fix it
            </Heading>
            <Text variant='body' className='mb-4'>
              {guide.solution}
            </Text>

            {guide.codeExample && (
              <div className='space-y-4'>
                {guide.codeExample.before && (
                  <CodeBlock
                    code={guide.codeExample.before}
                    language={guide.codeExample.language}
                    label='Before'
                  />
                )}
                <CodeBlock
                  code={guide.codeExample.after}
                  language={guide.codeExample.language}
                  label='After'
                />
              </div>
            )}
          </section>

          {/* Resources */}
          {guide.resources.length > 0 && (
            <section className='mb-10'>
              <Heading variant='section' as='h2' className='mb-3'>
                Resources
              </Heading>
              <ul className='space-y-2'>
                {guide.resources.map(r => (
                  <li key={r.url}>
                    <a
                      href={r.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-brand-500 hover:text-brand-600 underline underline-offset-2 text-sm'
                    >
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTA */}
          <section className='rounded-lg border border-border bg-surface-secondary p-6 text-center'>
            <Text variant='body' className='mb-3'>
              Want to check if your site has this issue?
            </Text>
            <Button as='link' href='/audit' name='violation-guide-cta'>
              Run a free audit
            </Button>
          </section>
        </div>
      </article>
    </PageLayout>
  );
}
