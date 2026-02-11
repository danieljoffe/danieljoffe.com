import { Container } from '@danieljoffe.com/shared-ui';
import { WithChildren } from '@/types/base';

export default function PostContent({ children }: WithChildren) {
  return <Container size='sm'>{children}</Container>;
}
