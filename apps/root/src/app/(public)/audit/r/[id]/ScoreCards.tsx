import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Section } from '@danieljoffe/shared-ui/Section';
import { Text } from '@danieljoffe/shared-ui/Text';

interface ScoreCardsProps {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
  deviceMode?: 'mobile' | 'desktop';
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#888';
  if (score >= 90) return '#63CAA5';
  if (score >= 75) return '#8C8FFF';
  if (score >= 60) return '#FFB46B';
  if (score >= 40) return '#FF8CA0';
  return '#FF6B6B';
}

interface ScoreCardItemProps {
  label: string;
  score: number | null;
}

function ScoreCardItem({ label, score }: ScoreCardItemProps) {
  const color = getScoreColor(score);

  return (
    <div className='rounded-lg border border-border bg-surface-elevated p-4 sm:p-6 text-center'>
      <Text variant='body' className='mb-2'>
        {label}
      </Text>
      <p className='text-4xl font-bold' style={{ color }}>
        {score !== null ? score : 'N/A'}
      </p>
    </div>
  );
}

export default function ScoreCards({
  performance,
  accessibility,
  seo,
  bestPractices,
  deviceMode,
}: ScoreCardsProps) {
  return (
    <Section aria-labelledby='scores-heading' overflow='hidden' center>
      <Heading
        variant='section'
        as='h2'
        id='scores-heading'
        className='sr-only'
      >
        Scores
      </Heading>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <ScoreCardItem label='Performance' score={performance} />
        <ScoreCardItem label='Accessibility' score={accessibility} />
        <ScoreCardItem label='SEO' score={seo} />
        <ScoreCardItem label='Best Practices' score={bestPractices} />
      </div>
      <Text variant='detail' className='text-center mt-3'>
        {deviceMode === 'desktop'
          ? 'Scores reflect a desktop device on a broadband connection.'
          : 'Scores reflect a mobile device on a 4G connection. Results may differ on desktop or faster networks.'}
      </Text>
    </Section>
  );
}
