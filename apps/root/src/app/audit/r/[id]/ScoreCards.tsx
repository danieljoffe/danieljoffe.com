import { Card, PageContainer, Section } from '@danieljoffe.com/shared-ui';

interface ScoreCardsProps {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
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
    <Card className='text-center'>
      <p className='text-sm text-foreground-muted mb-2'>{label}</p>
      <p className='text-4xl font-bold' style={{ color }}>
        {score !== null ? score : 'N/A'}
      </p>
    </Card>
  );
}

export default function ScoreCards({
  performance,
  accessibility,
  seo,
  bestPractices,
}: ScoreCardsProps) {
  return (
    <Section aria-labelledby='scores-heading' className='min-h-min max-h-max'>
      <PageContainer>
        <h2 id='scores-heading' className='sr-only'>
          Scores
        </h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <ScoreCardItem label='Performance' score={performance} />
          <ScoreCardItem label='Accessibility' score={accessibility} />
          <ScoreCardItem label='SEO' score={seo} />
          <ScoreCardItem label='Best Practices' score={bestPractices} />
        </div>
      </PageContainer>
    </Section>
  );
}
