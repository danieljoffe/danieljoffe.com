import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';
import { offerings } from '@/utils/offerings';
import {
  Rocket,
  BarChart3,
  Zap,
  Accessibility,
  Target,
  LayoutTemplate,
  Wrench,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Rocket,
  BarChart3,
  Zap,
  Accessibility,
  Target,
  LayoutTemplate,
  Wrench,
  UserCheck,
};

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
          <Grid as='ul' cols={2} gap='lg' className='w-full'>
            {offerings.achievements.map((achievement, index) => (
              <GridItem key={index} as='li'>
                <Card padding='md' elevated>
                  <Stack direction='horizontal' gap='md'>
                    {(() => {
                      const Icon = iconMap[achievement.icon];
                      return Icon ? (
                        <Icon
                          className='size-6 text-accent shrink-0 mt-1'
                          absoluteStrokeWidth={true}
                        />
                      ) : null;
                    })()}
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
