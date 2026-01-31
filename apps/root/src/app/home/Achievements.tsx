import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/ui';
import { offerings } from '@/utils/offerings';

export default function Achievements() {
  return (
    <Section
      aria-labelledby='achievements-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <Stack direction='vertical' gap='lg' align='center'>
          <h2 className='text-center' id='achievements-heading'>
            My Achievements
          </h2>
          <Grid as='ul' cols={1} gap='lg' className='w-full'>
            {offerings.achievements.map((achievement, index) => (
              <GridItem key={index} as='li'>
                <Card padding='md' elevated>
                  <Stack direction='horizontal' gap='md'>
                    <p className='text-2xl'>{achievement.icon}</p>
                    <Stack direction='vertical' gap='none'>
                      <h3>{achievement.metric}</h3>
                      <p>{achievement.text}</p>
                    </Stack>
                  </Stack>
                </Card>
              </GridItem>
            ))}
          </Grid>
        </Stack>
      </PageContainer>
    </Section>
  );
}
