import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Metric } from '@/components/kit/MetricsDashboard';
import { ServiceSection } from './ServiceSection';

const meta: Meta<typeof ServiceSection> = {
  component: ServiceSection,
  title: 'Services/ServiceSection',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className='max-w-3xl mx-auto p-6'>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ServiceSection>;

const sampleMetrics: Metric[] = [
  {
    label: 'Lighthouse Score',
    before: '32-43',
    after: '~80',
    improvement: '+40 points',
    delta: 'positive',
  },
  {
    label: 'Bundle Size',
    before: '650-800KB',
    after: '250-300KB',
    improvement: '~62% reduction',
    delta: 'positive',
  },
  {
    label: 'Mobile Bounce Rate',
    before: 'High',
    after: '-39%',
    improvement: '39% drop',
    delta: 'positive',
  },
];

export const Default: Story = {
  args: {
    id: 'perf-audits',
    painPoint: {
      headline: 'Your site takes 8 seconds to load.',
      subtext:
        "You're losing 53% of mobile visitors before they see your content.",
    },
    description:
      "I measure exactly what's slowing your site down, fix the biggest bottlenecks, and prove the improvement with before/after metrics.",
    questions: [
      {
        question: 'How is this different from running PageSpeed Insights?',
        answer:
          'PageSpeed gives you a score. I give you a fixed site. I diagnose root causes, implement fixes, and measure the real-world impact.',
      },
      {
        question: 'Do Core Web Vitals really affect search rankings?',
        answer:
          'Yes. Google uses Core Web Vitals as a ranking signal. Poor performance means lower visibility.',
      },
      {
        question: 'What platforms do you work with?',
        answer:
          'React, Next.js, Vue, WordPress, Shopify — performance principles apply universally.',
      },
    ],
    deliverables: [
      'Lighthouse & Core Web Vitals audit report',
      'Prioritized fix recommendations with effort estimates',
      'Implementation of top improvements',
      'Before/after performance metrics',
    ],
    proof: {
      title: 'FightCamp Performance Overhaul',
      metrics: sampleMetrics,
      caseStudySlug: 'fightcamp',
    },
    timeline: '2-4 weeks',
    price: '$5,000',
    ctaLabel: undefined,
    ctaHref: undefined,
  },
};

export const WithoutSubtext: Story = {
  args: {
    ...Default.args,
    id: 'component-libs',
    painPoint: {
      headline:
        'Your team rebuilds the same button, modal, and form on every project.',
      subtext: undefined,
    },
  },
};

export const EmptyMetrics: Story = {
  args: {
    ...Default.args,
    id: 'mvp-builds',
    proof: {
      title: 'Logistics Dashboard MVP',
      metrics: [],
      caseStudySlug: 'logistics-dashboard',
    },
  },
};

export const CustomCTA: Story = {
  args: {
    ...Default.args,
    id: 'custom-cta',
    ctaLabel: 'Get a free audit',
    ctaHref: '/contact?service=audit',
  },
};
