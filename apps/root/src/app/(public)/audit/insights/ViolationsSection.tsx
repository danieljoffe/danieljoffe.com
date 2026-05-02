'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import type { Violation } from './types';

type Category = 'performance' | 'accessibility' | 'seo' | 'ux';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'performance', label: 'Performance' },
  { key: 'accessibility', label: 'Accessibility' },
  { key: 'seo', label: 'SEO' },
  { key: 'ux', label: 'UX' },
];

interface ViolationsSectionProps {
  violations: Violation[];
  /** Map of violation title (lowercase) → guide slug. */
  guideSlugs: Record<string, string>;
}

function ViolationRow({
  violation,
  rank,
  guideSlug,
}: {
  violation: Violation;
  rank: number;
  guideSlug: string | undefined;
}) {
  const total =
    violation.severity.critical +
    violation.severity.warning +
    violation.severity.info;

  const titleContent = guideSlug ? (
    <Link
      href={`/audit/insights/violations/${guideSlug}`}
      className='hover:text-brand-500 underline underline-offset-2 decoration-border hover:decoration-brand-500 transition-colors'
    >
      {violation.title}
    </Link>
  ) : (
    violation.title
  );

  return (
    <li className='flex items-center justify-between py-3 border-b border-border last:border-b-0'>
      <div className='flex items-center gap-3 min-w-0'>
        <span className='text-sm font-medium text-muted w-6 shrink-0'>
          {rank}.
        </span>
        <Text variant='body' className='truncate'>
          {titleContent}
        </Text>
      </div>
      <div className='flex items-center gap-2 shrink-0 ml-4'>
        {violation.severity.critical > 0 && (
          <span
            className='text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            aria-label={`${violation.severity.critical} critical`}
          >
            {violation.severity.critical}
          </span>
        )}
        {violation.severity.warning > 0 && (
          <span
            className='text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            aria-label={`${violation.severity.warning} warnings`}
          >
            {violation.severity.warning}
          </span>
        )}
        <span
          className='text-sm font-medium text-muted'
          aria-label={`${total} total`}
        >
          {total.toLocaleString()}
        </span>
      </div>
    </li>
  );
}

function CategoryList({
  violations,
  category,
  guideSlugs,
}: {
  violations: Violation[];
  category: Category;
  guideSlugs: Record<string, string>;
}) {
  const filtered = violations.filter(v => v.category === category);

  if (filtered.length === 0) {
    return (
      <Text variant='detail' className='py-4 text-center'>
        No violations recorded yet.
      </Text>
    );
  }

  return (
    <ol className='list-none p-0'>
      {filtered.map((v, i) => (
        <ViolationRow
          key={v.title}
          violation={v}
          rank={i + 1}
          guideSlug={guideSlugs[v.title.toLowerCase()]}
        />
      ))}
    </ol>
  );
}

export default function ViolationsSection({
  violations,
  guideSlugs,
}: ViolationsSectionProps) {
  const [activeTab, setActiveTab] = useState<Category>('performance');
  const [expanded, setExpanded] = useState(false);

  return (
    <Section aria-labelledby='violations-heading'>
      <Heading variant='section' as='h2' id='violations-heading'>
        Top Violations
      </Heading>
      <Text variant='body' className='mt-2 mb-6'>
        The most common issues found across all audited sites.
      </Text>

      {!expanded && (
        <>
          <div
            role='tablist'
            aria-label='Violation categories'
            className='flex gap-1 mb-6 flex-wrap'
          >
            {CATEGORIES.map(cat => (
              <Button
                key={cat.key}
                name={`tab-${cat.key}`}
                variant={activeTab === cat.key ? 'primary' : 'ghost'}
                role='tab'
                aria-selected={activeTab === cat.key}
                aria-controls='violations-tabpanel'
                onClick={() => setActiveTab(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
          <div
            id='violations-tabpanel'
            role='tabpanel'
            aria-label={`${CATEGORIES.find(c => c.key === activeTab)?.label} violations`}
            className='rounded-lg border border-border bg-surface-elevated p-4'
          >
            <CategoryList
              violations={violations}
              category={activeTab}
              guideSlugs={guideSlugs}
            />
          </div>
        </>
      )}

      {expanded && (
        <div className='space-y-8'>
          {CATEGORIES.map(cat => (
            <div key={cat.key}>
              <Heading variant='subtitle' as='h3' className='mb-3'>
                {cat.label}
              </Heading>
              <div className='rounded-lg border border-border bg-surface-elevated p-4'>
                <CategoryList
                  violations={violations}
                  category={cat.key}
                  guideSlugs={guideSlugs}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='mt-4 text-center'>
        <Button
          name='toggle-violations-view'
          variant='ghost'
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? 'View Tabs' : 'View All'}
        </Button>
      </div>
    </Section>
  );
}
