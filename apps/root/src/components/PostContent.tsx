import { Container } from '@danieljoffe.com/ui';
import { WChildrenT } from '@/types/base';

export default function PostContent({ children }: WChildrenT) {
  return (
    <Container size='sm'>
      <div
        className={[
          'prose prose-headings:font-sans prose-headings:font-medium',
          'prose-base prose-body:font-serif w-full',
        ].join(' ')}
      >
        {children}
      </div>
    </Container>
  );
}
