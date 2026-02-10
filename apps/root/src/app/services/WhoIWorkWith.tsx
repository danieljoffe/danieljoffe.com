import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';
import {
  Rocket,
  TrendingUp,
  Building2,
  Target,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Rocket,
  TrendingUp,
  Building2,
  Target,
};

const audiences = [
  {
    icon: 'Rocket',
    label: 'Founders',
    description: 'who need a senior frontend partner, not just a pair of hands',
  },
  {
    icon: 'TrendingUp',
    label: 'Growing startups',
    description: 'whose engineering team is stretched thin',
  },
  {
    icon: 'Building2',
    label: 'Agencies',
    description:
      'that need overflow capacity from someone who can own a project end-to-end',
  },
  {
    icon: 'Target',
    label: 'Non-technical teams',
    description: 'drowning in engineering dependency for basic updates',
  },
];

export default function WhoIWorkWith() {
  return (
    <Section
      aria-labelledby='who-i-work-with-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer className='max-w-[40rem]'>
        <h2 id='who-i-work-with-heading' className='text-center'>
          Who I Work Best With
        </h2>
        <Grid as='ul' cols={1} gap='sm' className='md:grid-cols-2 list-none'>
          {audiences.map((audience, index) => (
            <GridItem key={index} as='li'>
              <Card padding='sm' className='h-full'>
                <Stack direction='horizontal' gap='sm' align='start'>
                  {(() => {
                    const Icon = iconMap[audience.icon];
                    return Icon ? (
                      <Icon
                        className='size-5 text-accent shrink-0 mt-0.5'
                        absoluteStrokeWidth={true}
                        aria-hidden='true'
                      />
                    ) : null;
                  })()}
                  <p>
                    <strong>{audience.label}</strong> {audience.description}
                  </p>
                </Stack>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}
