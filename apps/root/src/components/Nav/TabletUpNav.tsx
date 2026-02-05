import DarkModeToggle from './DarkModeToggle';
import NavLinks from './Links';

export default function TabletUpNav({ pathname }: { pathname: string }) {
  return (
    <div className='hidden md:flex w-full justify-center items-center py-4 px-8 gap-4'>
      <NavLinks pathname={pathname} />
      <DarkModeToggle />
    </div>
  );
}
