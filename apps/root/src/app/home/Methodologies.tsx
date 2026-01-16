import Container from '@/components/Container';
import ContentGrid from '@/components/ContentGrid';
import Section from '@/components/Section';
import { offerings } from '@/utils/offerings';

export default function Methodologies() {
  return (
    <Section ariaLabelBy='methodologies-heading'>
      <Container>
        <div className='flex flex-col gap-4'>
          <h2 className='text-center' id='methodologies-heading'>
            My Methodology
          </h2>
          <ContentGrid>
            {offerings.methodology.map((methodology, index) => (
              <li key={index} className='text-center flex flex-col'>
                <p className='text-2xl'>{methodology.icon}</p>
                <h3>{methodology.title}</h3>
                <p>{methodology.text}</p>
              </li>
            ))}
          </ContentGrid>
        </div>
      </Container>
    </Section>
  );
}
