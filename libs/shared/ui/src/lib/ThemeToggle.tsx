'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { cn } from './utils/cn';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className='inline-flex items-center gap-0.5 p-0.5 bg-surface-tertiary rounded-lg'>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-pressed={theme === value}
          className={cn(
            'p-1.5 rounded-md transition-all duration-150 cursor-pointer motion-reduce:transition-none',
            theme === value
              ? 'bg-surface text-text-primary shadow-xs'
              : 'text-text-tertiary hover:text-text-secondary'
          )}
        >
          <Icon className='h-4 w-4' />
        </button>
      ))}
    </div>
  );
}
