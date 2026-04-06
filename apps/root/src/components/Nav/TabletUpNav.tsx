import DarkModeToggle from './DarkModeToggle';
import SearchTrigger from './SearchTrigger';
import NavLinks from './Links';

export default function TabletUpNav({ pathname }: { pathname: string }) {
  return (
    <div className='hidden md:flex max-w-3xl mx-auto px-6 lg:px-0 h-14 items-center gap-4'>
      <NavLinks pathname={pathname} />
      <SearchTrigger />
      <DarkModeToggle />
    </div>
  );
}
