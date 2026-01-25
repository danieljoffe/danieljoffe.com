import { Card, Stack } from '@danieljoffe.com/ui';
import Container from '@/components/Container';
import Section from '@/components/Section';
import { offerings } from '@/utils/offerings';

export default function Achievements() {
  return (
    <Section
      ariaLabelBy='achievements-heading'
      className='bg-neutral-900 text-white'
    >
      <Container>
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
      </Container>
    </Section>
  );
}
