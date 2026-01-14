import Container from '@/components/Container';
import { offerings } from '@/utils/offerings';

export default function Methodologies() {
  return (
    <Container>
      <h2 className='text-center' id='methodologies-heading'>
        My Methodology
      </h2>
      <div className='grid md:grid-cols-2 md:grid-rows-2 gap-4 justify-items-center items-start py-4'>
        {offerings.methodology.map((methodology, index) => (
          <div key={index} className='text-center flex flex-col p-2 gap-2'>
            <p className='text-2xl'>{methodology.icon}</p>
            <h3 className='h4'>{methodology.title}</h3>
            <p>{methodology.text}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}
