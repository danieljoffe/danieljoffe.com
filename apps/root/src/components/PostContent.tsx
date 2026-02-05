import { Container } from '@danieljoffe.com/ui';
import { WChildrenT } from '@/types/base';

export default function PostContent({ children }: WChildrenT) {
  return <Container size='sm'>{children}</Container>;
}
