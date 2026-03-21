'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/state/Theme/ThemeProvider';
import { analytics } from '@/lib/analytics';

const options = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
];

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  const handleSelect = (value: 'light' | 'dark' | 'system') => {
    analytics.themeToggle(value);
    setTheme(value);
  };

  return (
    <div
      className='inline-flex items-center gap-0.5 p-0.5 bg-surface-tertiary rounded-lg'
      role='radiogroup'
      aria-label='Theme'
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          title={label}
          aria-label={`Switch to ${label.toLowerCase()} mode`}
          aria-checked={theme === value}
          role='radio'
          className={cn(
            'p-1.5 rounded-md transition-all duration-150 cursor-pointer',
            theme === value
              ? 'bg-surface text-text-primary shadow-xs'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
        >
          <Icon className='h-4 w-4' aria-hidden='true' />
        </button>
      ))}
    </div>
  );
}
