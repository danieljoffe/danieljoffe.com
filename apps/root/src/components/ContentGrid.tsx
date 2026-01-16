import { WChildrenT } from '@/types/base';

export default function ContentGrid({ children }: WChildrenT) {
  return (
    <ul
      className={[
        'grid grid-cols-1 md:grid-cols-2 md:grid-rows-2',
        'max-w-[30rem] mx-auto md:max-w-full min-w-min',
        'gap-6 md:gap-8',
      ].join(' ')}
    >
      {children}
    </ul>
  );
}
