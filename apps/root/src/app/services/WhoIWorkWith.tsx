import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';

const audiences = [
  {
    icon: '🚀',
    label: 'Founders',
    description: 'who need a senior frontend partner, not just a pair of hands',
  },
  {
    icon: '📈',
    label: 'Growing startups',
    description: 'whose engineering team is stretched thin',
  },
  {
    icon: '🏢',
    label: 'Agencies',
    description:
      'that need overflow capacity from someone who can own a project end-to-end',
  },
  {
    icon: '🎯',
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
              <Card padding='md' className='h-full'>
                <Stack direction='horizontal' gap='sm' align='start'>
                  <span className='text-xl' aria-hidden='true'>
                    {audience.icon}
                  </span>
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
