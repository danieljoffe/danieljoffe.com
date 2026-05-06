import type { Metadata } from 'next';
import Image from 'next/image';
import {
  ArrowRight,
  BarChart3,
  FileText,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';

const HERO_SUBTITLE =
  'Your profile is the scoring model. Top matches turn into ATS-safe drafts — traced to your experience, never hallucinated.';

export const metadata: Metadata = {
  title: 'WyrdFold',
  description: HERO_SUBTITLE,
  robots: { index: true, follow: true },
};

// Pure marketing page — no per-request data, no cookies, no Supabase. Render
// it once at build time so the first paint for unauthenticated visitors is
// pure CDN HTML.
export const dynamic = 'force-static';

interface Capability {
  title: string;
  body: string;
  icon: LucideIcon;
}

const CAPABILITIES: Capability[] = [
  {
    title: 'Match',
    body: 'Every new posting scored against your profile. Sorted by fit, broken down to the keyword.',
    icon: Target,
  },
  {
    title: 'Tailor',
    body: 'Top matches become tailored .docx drafts — markdown-editable, ATS-linted. Cover letters on the same pipeline.',
    icon: FileText,
  },
  {
    title: 'Track',
    body: 'Pipeline funnel, skill gaps, LLM cost. Click any chart to filter the job list underneath.',
    icon: BarChart3,
  },
];

const ATS_PROVIDERS = [
  'Greenhouse',
  'Lever',
  'Ashby',
  'Workday',
  'SmartRecruiters',
] as const;

interface Step {
  number: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Bring in your experience.',
    body: 'Upload a resume, talk through it, or both. The output is a master document — structured, editable, source-of-truth.',
  },
  {
    number: '02',
    title: "Name what you're looking for.",
    body: 'Pick or paste a target role. Its scoring profile gets derived from real job descriptions.',
  },
  {
    number: '03',
    title: 'The feed runs.',
    body: 'Every new posting scores against your profile. The good ones surface for review. The rest stay out of your way.',
  },
  {
    number: '04',
    title: 'Tailor on click.',
    body: 'One click turns a match into a tailored resume drafted from your master document — ATS-linted, .docx-ready. Cover letters on the same pipeline.',
  },
];

export default function WyrdfoldLandingPage() {
  return (
    <div className='mx-auto w-full max-w-6xl px-4 md:px-6'>
      {/* Hero */}
      <section className='py-16 md:py-24'>
        <div className='max-w-3xl'>
          <Heading
            variant='detail'
            as='h1'
            className='text-balance text-text-primary'
          >
            The search runs while you don&apos;t.
          </Heading>
          <Text
            variant='subtitle'
            as='p'
            className='mt-6 text-text-secondary text-pretty'
          >
            {HERO_SUBTITLE}
          </Text>
          <div className='mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4'>
            <Button
              name='wyrdfold-hero-sign-in'
              as='link'
              href='/login'
              variant='primary'
              size='md'
            >
              Sign in
              <ArrowRight className='size-4' aria-hidden='true' />
            </Button>
            <Button
              name='wyrdfold-hero-how-it-works'
              as='link'
              href='#how-it-works'
              variant='outline'
              size='md'
            >
              See how it works
            </Button>
          </div>
        </div>

        {/* Hero screenshot — optimized via scripts/optimize-covers.ts. */}
        <div className='mt-12 md:mt-16 rounded-xl border border-border-secondary bg-surface-elevated overflow-hidden'>
          <Image
            src='/images/dashboard-screenshot.webp'
            alt='WyrdFold dashboard with new matches, pipeline counters, and a top-matches list'
            width={1280}
            height={944}
            priority
            sizes='(min-width: 1024px) 1024px, 100vw'
            className='h-auto w-full'
          />
        </div>
      </section>

      {/* ATS provider strip */}
      <section className='border-y border-border py-8 md:py-10'>
        <div className='flex flex-col items-center gap-3 md:gap-4'>
          <p className='text-xs uppercase tracking-wider text-text-tertiary'>
            The feed runs across
          </p>
          <div className='flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:gap-x-7 font-mono text-sm md:text-base text-text-secondary'>
            {ATS_PROVIDERS.map((name, i) => (
              <span key={name} className='flex items-center gap-x-5 md:gap-x-7'>
                {i > 0 && (
                  <span aria-hidden='true' className='text-text-tertiary'>
                    ·
                  </span>
                )}
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className='py-16 md:py-24'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6'>
          {CAPABILITIES.map(cap => {
            const Icon = cap.icon;
            return (
              <Card
                key={cap.title}
                padding='lg'
                className='border-border-secondary transition-colors duration-200 motion-reduce:transition-none hover:border-brand-300/60 hover:bg-surface-elevated'
              >
                <CardContent className='flex flex-col gap-3'>
                  <div className='flex items-center gap-3'>
                    <Icon
                      className='size-5 text-brand-300'
                      aria-hidden='true'
                    />
                    <Heading variant='component' as='h3'>
                      {cap.title}
                    </Heading>
                  </div>
                  <Text variant='body' as='p'>
                    {cap.body}
                  </Text>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section
        id='how-it-works'
        aria-labelledby='how-it-works-heading'
        className='scroll-mt-24 py-16 md:py-24'
      >
        <div className='mx-auto max-w-xl'>
          <Heading
            variant='section'
            as='h2'
            id='how-it-works-heading'
            className='mb-10 md:mb-14 text-center'
          >
            How it works
          </Heading>
          <ol>
            {STEPS.map((step, i) => {
              const isLast = i === STEPS.length - 1;
              return (
                <li
                  key={step.number}
                  className='grid grid-cols-[auto_1fr] gap-x-5 md:gap-x-6'
                >
                  {/* Marker column: number stacked over the connecting rail.
                    Padding lives on the content column (next sibling) so the
                    rail's flex-1 stretches through the gap between steps. */}
                  <div className='flex flex-col items-center'>
                    <span
                      aria-hidden='true'
                      className='font-mono text-sm md:text-base text-brand-300 tabular-nums leading-none pt-1'
                    >
                      {step.number}
                    </span>
                    {!isLast && (
                      <span
                        aria-hidden='true'
                        className='mt-2 w-px flex-1 bg-brand-300/25'
                      />
                    )}
                  </div>
                  <div
                    className={`flex flex-col gap-2 ${
                      isLast ? '' : 'pb-10 md:pb-12'
                    }`}
                  >
                    <Heading variant='component' as='h3'>
                      {step.title}
                    </Heading>
                    <Text variant='bodyLg' as='p'>
                      {step.body}
                    </Text>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Footer CTA */}
      <section className='py-16 md:py-24 border-t border-border'>
        <div className='flex flex-col items-center gap-6 text-center'>
          <Heading variant='section' as='h2' className='max-w-2xl text-balance'>
            You&apos;ll be authenticated in two clicks.
          </Heading>
          <Button
            name='wyrdfold-footer-sign-in'
            as='link'
            href='/login'
            variant='primary'
            size='lg'
          >
            Sign in with email
            <ArrowRight className='size-4' aria-hidden='true' />
          </Button>
        </div>
      </section>
    </div>
  );
}
