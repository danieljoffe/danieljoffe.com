import { Container } from '@danieljoffe.com/shared-ui';
import DarkModeToggle from './DarkModeToggle';
import NavLinks from './Links';

export default function TabletUpNav({ pathname }: { pathname: string }) {
  return (
    <Container size='sm' className='hidden md:flex h-16 gap-4'>
      <NavLinks pathname={pathname} />
      <DarkModeToggle />
    </Container>
  );
}
