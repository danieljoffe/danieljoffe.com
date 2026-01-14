import Container from '@/components/Container';
import FullTimeline from './FullTimeline';
import Overview from './Overview';
import Intro from './Intro';

export default function Timeline() {
  return (
    <Container className='bg-neutral-900 text-white'>
      <div className='flex flex-col gap-8'>
        <Intro />
        <Overview />
        <FullTimeline />
      </div>
    </Container>
  );
}
