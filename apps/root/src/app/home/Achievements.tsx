import { Card, Stack, PageContainer, Section } from '@danieljoffe.com/ui';
import { offerings } from '@/utils/offerings';

export default function Achievements() {
  return (
    <Section
      aria-labelledby='achievements-heading'
      className='min-h-min max-h-max bg-neutral-900 text-white'
    >
      <PageContainer>
        <Stack direction='vertical' gap='lg' align='center'>
          <h2 className='text-center' id='achievements-heading'>
            My Achievements
          </h2>
          {offerings.achievements.map((achievement, index) => (
            <Card
              key={index}
              padding='md'
              className='w-full max-w-[28rem] bg-neutral-100 text-black border-none'
            >
              <Stack direction='horizontal' gap='md'>
                <p className='text-2xl'>{achievement.icon}</p>
                <Stack direction='vertical' gap='none'>
                  <h3>{achievement.metric}</h3>
                  <p>{achievement.text}</p>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </PageContainer>
    </Section>
  );
}
