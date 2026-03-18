import { howItWorks } from '@/data/services';
import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';

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
          {howItWorks.map((step, index) => (
            <GridItem key={index} as='li'>
              <Card padding='none' className='flex w-full h-full py-3 px-4'>
                <Stack direction='vertical' gap='xs' align='start'>
                  <h3 className='flex gap-4 items-center'>
                    <span className='inline-flex items-center justify-center size-10 rounded-full bg-brand-500 text-text-inverse font-bold'>
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
