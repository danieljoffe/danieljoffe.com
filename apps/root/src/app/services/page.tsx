import type { Metadata } from 'next';
import {
  Check,
  ChevronDown,
  ArrowUpRight,
  Layers,
  Users,
  HelpCircle,
} from 'lucide-react';
import { servicesMetadata } from '@/data/metadata/services';
import { services, servicesAudience, howItWorks } from '@/data/services';
import { CALENDLY_URL, FULL_NAME } from '@/utils/constants';
import { servicesPageStructuredData } from '@/data/structuredData/services';
import {
  Section,
  SectionLabel,
  PageLayout,
  CTACard,
  StructuredData,
} from '@/components/kit';
import { badgeVariants } from '@/lib/badgeStyles';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import Button from '@/components/Button';
import HeroCTA from './HeroCTA';
import FAQ from './FAQ';

export const metadata: Metadata = servicesMetadata;

export default function Services() {
  return (
    <PageLayout>
      {/* ══════════════════════════════════
          HERO
          ══════════════════════════════════ */}
      <Section>
        <div className='text-center space-y-6'>
          <span className={badgeVariants['brand-solid']}>
            Currently available for new projects
          </span>
          <h1 className='text-4xl sm:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]'>
            Your frontend is costing you users.
          </h1>
          <p className='text-lg text-text-secondary max-w-lg mx-auto'>
            I help startups and growing teams ship faster, load faster, and stop
            depending on engineering for everything.
          </p>
          <div className='flex flex-col items-center gap-4 pt-2'>
            <HeroCTA />
            <a
              href='#services-grid'
              className='inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary transition-colors'
            >
              See what I offer
              <ChevronDown className='h-4 w-4' />
            </a>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════
          SERVICES GRID
          ══════════════════════════════════ */}
      <Section>
        <div id='services-grid'>
          <SectionLabel
            icon={<Layers className='h-3.5 w-3.5' />}
            label='Services'
          />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {services.map((service, i) => (
            <div key={i} className={cn(cardBase, 'p-5 flex flex-col')}>
              <div className='space-y-4 flex-1'>
                <div className='flex items-center gap-2'>
                  <service.Icon className='h-5 w-5 text-brand-500 shrink-0' />
                  <p className='text-sm font-semibold text-text-primary'>
                    {service.title}
                  </p>
                </div>

                {service.highlighted && (
                  <span className={badgeVariants.brand}>Most popular</span>
                )}

                <p className='text-sm text-text-secondary leading-relaxed'>
                  {service.description}
                </p>

                <div>
                  <p className='text-xs font-semibold text-text-primary mb-2'>
                    What you get:
                  </p>
                  <ul className='space-y-1.5'>
                    {service.deliverables.map((item, j) => (
                      <li
                        key={j}
                        className='text-sm text-text-secondary flex items-start gap-2'
                      >
                        <Check className='h-3.5 w-3.5 text-success shrink-0 mt-0.5' />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className='text-xs text-text-tertiary italic border-l-2 border-brand-200 pl-3'>
                  {service.proof}
                </p>
              </div>

              <div className='flex items-center gap-4 pt-4 mt-4 border-t border-border text-xs text-text-tertiary'>
                <span>
                  <span className='font-semibold text-text-secondary'>
                    Timeline:
                  </span>{' '}
                  {service.timeline}
                </span>
                <span>
                  <span className='font-semibold text-text-secondary'>
                    From:
                  </span>{' '}
                  {service.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          HOW I WORK
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='How I Work'
        />
        <div className='space-y-3'>
          {howItWorks.map(step => (
            <div
              key={step.number}
              className='flex items-start gap-4 p-4 rounded-xl border border-border'
            >
              <span className='inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand-600 text-white text-sm font-bold shrink-0'>
                {step.number}
              </span>
              <div>
                <p className='text-sm font-semibold text-text-primary'>
                  {step.title}
                </p>
                <p className='text-sm text-text-secondary mt-1 leading-relaxed'>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          WHO I WORK WITH
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Users className='h-3.5 w-3.5' />}
          label='Who I Work Best With'
        />
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
          {servicesAudience.map((audience, i) => (
            <div key={i} className={cn(cardBase, 'flex items-start gap-3 p-4')}>
              <audience.Icon className='h-4 w-4 text-brand-500 shrink-0 mt-0.5' />
              <p className='text-sm text-text-secondary'>
                <span className='font-semibold text-text-primary'>
                  {audience.label}
                </span>{' '}
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════
          FAQ
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<HelpCircle className='h-3.5 w-3.5' />}
          label='FAQ'
        />
        <FAQ />
      </Section>

      {/* ══════════════════════════════════
          CTA
          ══════════════════════════════════ */}
      <Section>
        <CTACard
          heading="Let's figure out how I can help."
          description={
            <>
              Book a free 30-minute call. No contracts, no
              commitments&mdash;just a conversation about your frontend
              challenges.
            </>
          }
        >
          <div className='flex justify-center'>
            <Button
              as='link'
              href={CALENDLY_URL}
              target='_blank'
              size='sm'
              aria-label={`Book a discovery call with ${FULL_NAME}`}
            >
              Book a Discovery Call
              <ArrowUpRight className='h-4 w-4' />
            </Button>
          </div>
        </CTACard>
      </Section>

      <StructuredData data={servicesPageStructuredData} />
    </PageLayout>
  );
}
