import type { Metadata } from 'next';
import { Check, ChevronDown, Layers, Users, HelpCircle } from 'lucide-react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { SectionLabel } from '@danieljoffe.com/shared-ui/SectionLabel';
import { StructuredData } from '@danieljoffe.com/shared-ui/StructuredData';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe.com/shared-ui/styles/formStyles';
import { servicesPageStructuredData } from '@/data/structuredData/services';
import { services, servicesAudience, howItWorks } from '@/data/services';
import { servicesMetadata } from '@/data/metadata/services';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import HeroCTA from './HeroCTA';
import CalendlyEmbed from './CalendlyEmbed';
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
          <Badge variant='brand-solid'>
            Currently available for new projects
          </Badge>
          <Heading variant='hero'>Your frontend is costing you users.</Heading>
          <Text variant='subtitle' className='max-w-lg mx-auto'>
            I help startups and growing teams ship faster, load faster, and stop
            depending on engineering for everything.
          </Text>
          <div className='flex flex-col items-center gap-4 pt-2'>
            <HeroCTA />
            <a
              href='#services-grid'
              className={`inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary transition-colors rounded-sm ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
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
                  <Heading variant='cardTitle' as='p'>
                    {service.title}
                  </Heading>
                </div>

                {service.highlighted && (
                  <Badge variant='brand'>Most popular</Badge>
                )}

                <Text variant='body'>{service.description}</Text>

                <div>
                  <Text
                    variant='label'
                    as='p'
                    className='mb-2 text-text-primary'
                  >
                    What you get:
                  </Text>
                  <ul className='space-y-1.5'>
                    {service.deliverables.map((item, j) => (
                      <li key={j} className='flex items-start gap-2'>
                        <Check className='h-3.5 w-3.5 text-success shrink-0 mt-0.5' />
                        <Text variant='body' as='span'>
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>

                <Text
                  variant='meta'
                  as='p'
                  className='italic border-l-2 border-brand-200 pl-3'
                >
                  {service.proof}
                </Text>
              </div>

              <div className='flex items-center gap-4 pt-4 mt-4 border-t border-border'>
                <Text variant='meta' as='span'>
                  <Text variant='detail' as='span' className='font-semibold'>
                    Timeline:
                  </Text>{' '}
                  {service.timeline}
                </Text>
                <Text variant='meta' as='span'>
                  <Text variant='detail' as='span' className='font-semibold'>
                    From:
                  </Text>{' '}
                  {service.price}
                </Text>
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
        {/* Mobile: vertical timeline / Desktop: horizontal 4-column grid */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-0'>
          {howItWorks.map((step, i) => {
            const isLast = i === howItWorks.length - 1;
            return (
              <div
                key={step.number}
                className={cn(
                  'relative flex items-start gap-4 py-4 pl-0 pr-0',
                  'md:flex-col md:items-center md:text-center md:px-3 md:py-0'
                )}
              >
                {/* ── Circle ── */}
                <div className='relative z-10 shrink-0'>
                  <span className='inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand-600 text-white text-sm font-bold'>
                    {step.number}
                  </span>
                </div>

                {/* ── Mobile vertical connector (below circle) ── */}
                {!isLast && (
                  <span
                    aria-hidden='true'
                    className={cn(
                      'absolute left-[calc(1.125rem-1px)] top-[calc(2.25rem+0.5rem)] bottom-0',
                      'w-0.5 bg-brand-200',
                      'md:hidden'
                    )}
                  />
                )}

                {/* ── Desktop horizontal connector (right of circle) ── */}
                {!isLast && (
                  <span
                    aria-hidden='true'
                    className={cn(
                      'hidden md:block absolute',
                      'top-[calc(1.125rem-1px)] left-[calc(50%+1.125rem)] right-0',
                      'h-0.5 bg-brand-200'
                    )}
                  />
                )}

                {/* ── Content ── */}
                <div className='min-w-0 md:mt-4'>
                  <Heading variant='cardTitle' as='p'>
                    {step.title}
                  </Heading>
                  <Text variant='body' className='mt-1'>
                    {step.description}
                  </Text>
                </div>
              </div>
            );
          })}
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
              <Text variant='body'>
                <span className='font-semibold text-text-primary'>
                  {audience.label}
                </span>{' '}
                {audience.description}
              </Text>
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
          CTA — Inline Calendly Embed
          ══════════════════════════════════ */}
      <Section>
        <div className='text-center space-y-2 mb-6'>
          <Heading variant='section'>
            Let&apos;s figure out how I can help.
          </Heading>
          <Text variant='bodyLg'>
            Book a free 30-minute call. No contracts, no commitments. Just a
            conversation about your engineering challenges.
          </Text>
        </div>
        <CalendlyEmbed />
      </Section>

      <StructuredData data={servicesPageStructuredData} />
    </PageLayout>
  );
}
