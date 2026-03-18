'use client';

import { Moon, Sun } from 'lucide-react';
import Button from '@/components/Button';
import { useTheme } from '@danieljoffe.com/shared-ui';
import { analytics } from '@/lib/analytics';

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleToggle = () => {
    analytics.themeToggle(isDarkMode ? 'light' : 'dark');
    toggleDarkMode();
  };

  return (
    <Button
      variant='bare'
      size='sm'
      onClick={handleToggle}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      name='toggle-dark-mode'
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className='h-5 w-5' aria-hidden='true' />
      ) : (
        <Moon className='h-5 w-5' aria-hidden='true' />
      )}
    </Button>
  );
}
