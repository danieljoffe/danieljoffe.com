'use client';

import { Search } from 'lucide-react';
import { Kbd } from '@danieljoffe.com/shared-ui/Kbd';

export default function SearchTrigger() {
  const handleClick = () => {
    document.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <button
      onClick={handleClick}
      aria-label='Search (⌘K)'
      data-testid='search-trigger'
      className='flex items-center gap-1.5 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer'
    >
      <Search className='h-4 w-4' aria-hidden='true' />
      <Kbd>⌘K</Kbd>
    </button>
  );
}
