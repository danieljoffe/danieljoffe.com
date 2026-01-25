import { Stack } from '@danieljoffe.com/ui';
import Container from '@/components/Container';
import ContentGrid from '@/components/ContentGrid';
import Section from '@/components/Section';
import { offerings } from '@/utils/offerings';

export default function Methodologies() {
  return (
    <Section ariaLabelBy='methodologies-heading'>
      <Container>
        <Stack direction='vertical' gap='md'>
          <h2 className='text-center' id='methodologies-heading'>
            My Methodology
          </h2>
          <ContentGrid>
            {offerings.methodology.map((methodology, index) => (
              <li key={index}>
                <Stack
                  direction='vertical'
                  gap='none'
                  align='center'
                  className='text-center'
                >
                  <p className='text-2xl'>{methodology.icon}</p>
                  <h3>{methodology.title}</h3>
                  <p>{methodology.text}</p>
                </Stack>
              </li>
            ))}
          </ContentGrid>
        </Stack>
      </Container>
    </Section>
  );
}
