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
        <div className='flex flex-col gap-4 items-center md:gap-8'>
          <h2 className='text-center' id='achievements-heading'>
            My Achievements
          </h2>
          {offerings.achievements.map((achievement, index) => (
            <div
              key={index}
              className={[
                'flex gap-4 w-full max-w-[28rem] pt-4 px-4 pb-6',
                'bg-neutral-100 text-black rounded-[5px]',
              ].join(' ')}
            >
              <p className='text-2xl'>{achievement.icon}</p>
              <div className='flex flex-col'>
                <h3>{achievement.metric}</h3>
                <p>{achievement.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
