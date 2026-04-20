import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { scoreDelta } from './calcDelta';
import DeltaIndicator from './DeltaIndicator';

interface ScoreDeltaCardsProps {
  scanA: {
    score_performance: number | null;
    score_accessibility: number | null;
    score_best_practices: number | null;
    score_seo: number | null;
  };
  scanB: {
    score_performance: number | null;
    score_accessibility: number | null;
    score_best_practices: number | null;
    score_seo: number | null;
  };
}

interface CardProps {
  label: string;
  a: number | null;
  b: number | null;
}

function formatScore(n: number): string {
  return String(Math.round(n));
}

function Card({ label, a, b }: CardProps) {
  const delta = scoreDelta(a, b);
  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-6 text-center flex flex-col gap-2'>
      <Text variant='body'>{label}</Text>
      <div className='flex items-baseline justify-center gap-2'>
        <span className='text-2xl text-text-secondary tabular-nums'>
          {a ?? 'N/A'}
        </span>
        <span className='text-text-secondary'>→</span>
        <span className='text-3xl font-bold tabular-nums'>{b ?? 'N/A'}</span>
      </div>
      <div className='flex justify-center'>
        <DeltaIndicator delta={delta} formatValue={formatScore} />
      </div>
    </div>
  );
}

export default function ScoreDeltaCards({
  scanA,
  scanB,
}: ScoreDeltaCardsProps) {
  return (
    <section
      aria-labelledby='score-delta-heading'
      className='w-full overflow-hidden'
    >
      <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
        <Heading variant='section' as='h2' id='score-delta-heading'>
          Scores
        </Heading>
        <Text variant='detail' className='mb-4'>
          Previous value → current value, with the change between scans.
        </Text>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card
            label='Performance'
            a={scanA.score_performance}
            b={scanB.score_performance}
          />
          <Card
            label='Accessibility'
            a={scanA.score_accessibility}
            b={scanB.score_accessibility}
          />
          <Card label='SEO' a={scanA.score_seo} b={scanB.score_seo} />
          <Card
            label='Best Practices'
            a={scanA.score_best_practices}
            b={scanB.score_best_practices}
          />
        </div>
      </div>
    </section>
  );
}
