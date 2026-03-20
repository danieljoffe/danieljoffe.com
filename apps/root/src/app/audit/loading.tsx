import { Spinner } from '@/components/kit';

export default function Loading() {
  return (
    <div className='flex min-h-[60vh] items-center justify-center'>
      <Spinner label='Loading audit page' />
    </div>
  );
}
