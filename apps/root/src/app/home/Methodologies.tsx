import Container from '@/components/Container';
import ContentGrid from '@/components/ContentGrid';
import { offerings } from '@/utils/offerings';

export default function Methodologies() {
  return (
    <Container>
      <h2 className='text-center' id='methodologies-heading'>
        My Methodology
      </h2>
      <ContentGrid>
        {offerings.methodology.map((methodology, index) => (
          <li key={index} className='text-center flex flex-col p-2 gap-2'>
            <p className='text-2xl'>{methodology.icon}</p>
            <h3 className='h4'>{methodology.title}</h3>
            <p>{methodology.text}</p>
          </li>
        ))}
      </ContentGrid>
    </Container>
  );
}
