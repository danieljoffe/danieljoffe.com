import { WChildrenT } from '@/types/base';
import Container from './units/Container';

export default function PostContent({ children }: WChildrenT) {
  return (
    <Container>
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
