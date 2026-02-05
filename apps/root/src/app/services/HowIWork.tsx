import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';

const steps = [
  {
    number: '1',
    title: 'Discovery Call (Free)',
    description:
      "We talk about your problem, timeline, and budget. No pitch decks. I'll tell you honestly whether I'm the right fit.",
  },
  {
    number: '2',
    title: 'Scope & Proposal',
    description:
      'You get a clear scope document with deliverables, timeline, and fixed price. No hourly surprises.',
  },
  {
    number: '3',
    title: 'Build & Ship',
    description:
      'I work in weekly sprints with async updates. You see progress every week, not just at the end.',
  },
  {
    number: '4',
    title: 'Handoff & Support',
    description:
      "Clean code, documentation, and a walkthrough. I don't leave you with a codebase nobody can maintain.",
  },
];

export default function HowIWork() {
  return (
    <Section
      aria-labelledby='how-i-work-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h2 id='how-i-work-heading' className='text-center'>
          How I Work
        </h2>
        <Grid as='ol' cols={1} gap='md'>
          {steps.map((step, index) => (
            <GridItem key={index} as='li'>
              <Card padding='md' className='h-full'>
                <Stack direction='vertical' gap='sm' align='start'>
                  <h3 className='flex gap-4 items-center'>
                    <span className='inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground font-bold'>
                      {step.number}
                    </span>
                    <span>{step.title}</span>
                  </h3>
                  <p className='text-sm'>{step.description}</p>
                </Stack>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}
