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
import type { Column } from '@danieljoffe.com/shared-ui/Table';
import { Table } from '@danieljoffe.com/shared-ui/Table';
import { Step } from '@/components/kit';
import { servicesPageStructuredData } from '@/data/structuredData/services';
import {
  services,
  servicesAudience,
  howItWorks,
  performanceAuditsSection,
  componentLibrariesSection,
  cmsToolingSection,
  mvpBuildsSection,
  painPointMatchers,
  serviceComparisons,
} from '@/data/services';
import { servicesMetadata } from '@/data/metadata/services';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';
import { ServiceSection } from './ServiceSection';
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
          SERVICE SELECTION GUIDE
          ══════════════════════════════════ */}
      <Section>
        <Heading variant='section'>Not sure which service?</Heading>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6'>
          {painPointMatchers.map(matcher => (
            <a
              key={matcher.anchor}
              href={matcher.anchor}
              className={cn(
                cardBase,
                'p-5 flex flex-col gap-3 transition-colors hover:border-brand-500'
              )}
            >
              <Text variant='body'>{matcher.problem}</Text>
              <div className='flex items-center justify-between mt-auto pt-2 border-t border-border'>
                <Badge variant='brand'>{matcher.service}</Badge>
                <Text variant='meta' as='span'>
                  From {matcher.price}
                </Text>
              </div>
            </a>
          ))}
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
          PERFORMANCE AUDITS
          ══════════════════════════════════ */}
      <Section>
        <ServiceSection {...performanceAuditsSection} />
      </Section>

      {/* ══════════════════════════════════
          COMPONENT LIBRARIES
          ══════════════════════════════════ */}
      <Section>
        <ServiceSection {...componentLibrariesSection} />
      </Section>

      {/* ══════════════════════════════════
          CMS & TOOLING
          ══════════════════════════════════ */}
      <Section>
        <ServiceSection {...cmsToolingSection} />
      </Section>

      {/* ══════════════════════════════════
          MVP BUILDS
          ══════════════════════════════════ */}
      <Section>
        <ServiceSection {...mvpBuildsSection} />
      </Section>

      {/* ══════════════════════════════════
          HOW I WORK
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='How I Work'
        />

        {/* Desktop: horizontal stepper */}
        <div className='hidden md:grid md:grid-cols-4 gap-6'>
          {howItWorks.map((step, i) => (
            <div key={step.number} className='relative text-center'>
              {/* Connecting line */}
              {i < howItWorks.length - 1 && (
                <div className='absolute top-4.5 left-[calc(50%+1.125rem)] right-[calc(-50%+1.125rem)] h-px bg-border' />
              )}
              <Step
                number={step.number}
                title={step.title}
                description={step.description}
                className='flex-col items-center text-center'
              />
            </div>
          ))}
        </div>

        {/* Mobile: connected vertical timeline */}
        <div className='md:hidden space-y-0'>
          {howItWorks.map((step, i) => (
            <div key={step.number} className='relative pb-6 last:pb-0'>
              {/* Vertical connecting line */}
              {i < howItWorks.length - 1 && (
                <div className='absolute left-4.5 top-9 bottom-0 w-px bg-border' />
              )}
              <Step
                number={step.number}
                title={step.title}
                description={step.description}
              />
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
          COMPARE SERVICES
          ══════════════════════════════════ */}
      <Section>
        <SectionLabel
          icon={<Layers className='h-3.5 w-3.5' />}
          label='Compare Services'
        />

        {/* Desktop: table */}
        <div className='hidden md:block'>
          <Table
            columns={
              [
                { key: 'attribute', header: '', width: '20%' },
                {
                  key: 'performanceAudit',
                  header: 'Performance Audit',
                },
                {
                  key: 'componentLibrary',
                  header: 'Component Library',
                },
                { key: 'cmsTooling', header: 'CMS & Tooling' },
                { key: 'mvpBuild', header: 'MVP Build' },
              ] as Column<(typeof serviceComparisons)[number]>[]
            }
            data={serviceComparisons}
            striped
            ariaLabel='Service comparison table'
          />
        </div>

        {/* Mobile: stacked cards */}
        <div className='md:hidden space-y-4'>
          {serviceComparisons.map(row => (
            <div key={row.attribute} className={cn(cardBase, 'p-4')}>
              <Text variant='label' as='p' className='mb-2 text-text-primary'>
                {row.attribute}
              </Text>
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <Text variant='meta' as='p' className='text-text-tertiary'>
                    Performance Audit
                  </Text>
                  <Text variant='body' as='p'>
                    {row.performanceAudit}
                  </Text>
                </div>
                <div>
                  <Text variant='meta' as='p' className='text-text-tertiary'>
                    Component Library
                  </Text>
                  <Text variant='body' as='p'>
                    {row.componentLibrary}
                  </Text>
                </div>
                <div>
                  <Text variant='meta' as='p' className='text-text-tertiary'>
                    CMS & Tooling
                  </Text>
                  <Text variant='body' as='p'>
                    {row.cmsTooling}
                  </Text>
                </div>
                <div>
                  <Text variant='meta' as='p' className='text-text-tertiary'>
                    MVP Build
                  </Text>
                  <Text variant='body' as='p'>
                    {row.mvpBuild}
                  </Text>
                </div>
              </div>
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
