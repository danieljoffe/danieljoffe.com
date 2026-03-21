import { WithChildren } from '@/types/base';

export default function PostContent({ children }: WithChildren) {
  return (
    <div className='mx-auto w-full px-4 sm:px-6 max-w-3xl'>{children}</div>
  );
}
