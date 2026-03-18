import {
  Card,
  Grid,
  GridItem,
  PageContainer,
  Section,
  Stack,
} from '@danieljoffe.com/shared-ui';

const steps = [
  {
    number: 1,
    title: 'Paste your URL',
    description:
      'Enter any website address and we\u2019ll run a comprehensive audit.',
  },
  {
    number: 2,
    title: 'Get your report',
    description:
      'Performance, accessibility, SEO, and best practices \u2014 all graded.',
  },
  {
    number: 3,
    title: 'Fix what matters',
    description: 'Prioritized recommendations with difficulty ratings.',
  },
];

export default function HowItWorks() {
  return (
    <Section
      aria-labelledby='how-it-works-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <h2 id='how-it-works-heading' className='text-center'>
          How It Works
        </h2>
        <Grid as='ol' cols={3} gap='md'>
          {steps.map(step => (
            <GridItem key={step.number} as='li'>
              <Card padding='none' className='flex w-full h-full py-6 px-5'>
                <Stack direction='vertical' gap='sm' align='start'>
                  <span className='inline-flex items-center justify-center size-10 rounded-full bg-brand-500 text-text-inverse font-bold'>
                    {step.number}
                  </span>
                  <h3 className='text-lg font-semibold'>{step.title}</h3>
                  <p className='text-sm text-text-secondary'>
                    {step.description}
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
