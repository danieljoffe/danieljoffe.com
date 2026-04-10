import { Check, ArrowUpRight } from 'lucide-react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Divider } from '@danieljoffe.com/shared-ui/Divider';
import {
  MetricsDashboard,
  type Metric,
} from '@/components/kit/MetricsDashboard';
import Button from '@/components/Button';
import { cardBase } from '@/lib/layoutStyles';
import { cn } from '@/lib/cn';

interface ServiceSectionQuestion {
  question: string;
  answer: string;
}

interface ServiceSectionProof {
  title: string;
  metrics: Metric[];
  caseStudySlug: string;
}

export interface ServiceSectionProps {
  id: string;
  painPoint: { headline: string; subtext: string | undefined };
  description: string;
  questions: ServiceSectionQuestion[];
  deliverables: string[];
  proof: ServiceSectionProof;
  timeline: string;
  price: string;
  ctaLabel: string | undefined;
  ctaHref: string | undefined;
}

export function ServiceSection({
  id,
  painPoint,
  description,
  questions,
  deliverables,
  proof,
  timeline,
  price,
  ctaLabel,
  ctaHref,
}: ServiceSectionProps) {
  return (
    <section id={id} className='space-y-8'>
      {/* Pain Point Hook */}
      <div>
        <Heading variant='section'>{painPoint.headline}</Heading>
        {painPoint.subtext && (
          <Text variant='bodyLg' className='mt-2'>
            {painPoint.subtext}
          </Text>
        )}
      </div>

      {/* Service Description */}
      <Text variant='bodyLg'>{description}</Text>

      <Divider />

      {/* Common Questions */}
      <div>
        <Heading variant='cardTitle' as='h3' className='mb-4'>
          Common questions
        </Heading>
        <dl className='space-y-4'>
          {questions.map(q => (
            <div key={q.question}>
              <dt className='font-semibold text-text-primary'>{q.question}</dt>
              <dd className='mt-1 text-text-secondary'>{q.answer}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Divider />

      {/* Deliverables */}
      <div>
        <Heading variant='cardTitle' as='h3' className='mb-4'>
          What you get
        </Heading>
        <ul className='space-y-2'>
          {deliverables.map(item => (
            <li key={item} className='flex items-start gap-2'>
              <Check className='h-4 w-4 text-success shrink-0 mt-0.5' />
              <Text variant='body' as='span'>
                {item}
              </Text>
            </li>
          ))}
        </ul>
      </div>

      <Divider />

      {/* Proof Section */}
      <div>
        <Heading variant='cardTitle' as='h3' className='mb-4'>
          {proof.title}
        </Heading>
        {proof.metrics.length > 0 ? (
          <MetricsDashboard metrics={proof.metrics} />
        ) : (
          <div className={cn(cardBase, 'p-5')}>
            <Text variant='body'>See how this played out in practice.</Text>
          </div>
        )}
        <Button
          as='link'
          href={`/projects/${proof.caseStudySlug}`}
          variant='ghost'
          size='sm'
          name={`${id}-case-study`}
          className='mt-3'
        >
          View case study
          <ArrowUpRight className='h-4 w-4' />
        </Button>
      </div>

      <Divider />

      {/* Timeline & Investment */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex gap-6'>
          <div>
            <Text variant='label' as='p' className='text-text-tertiary'>
              Timeline
            </Text>
            <Text variant='body' as='p' className='font-semibold'>
              {timeline}
            </Text>
          </div>
          <div>
            <Text variant='label' as='p' className='text-text-tertiary'>
              Starting at
            </Text>
            <Text variant='body' as='p' className='font-semibold'>
              {price}
            </Text>
          </div>
        </div>
        <Button
          as='link'
          href={ctaHref ?? '#calendly'}
          variant='primary'
          size='md'
          name={`service-cta-${id}`}
        >
          {ctaLabel ?? 'Book a free call'}
        </Button>
      </div>
    </section>
  );
}
