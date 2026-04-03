'use client';

import { useCallback } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/state/Theme/ThemeProvider';
import { analytics } from '@/lib/analytics';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { Kbd } from '@/components/kit';

const options = [
  { value: 'light' as const, icon: Sun, label: 'Light' },
  { value: 'dark' as const, icon: Moon, label: 'Dark' },
  { value: 'system' as const, icon: Monitor, label: 'System' },
];

const cycleOrder: ('light' | 'dark' | 'system')[] = [
  'light',
  'dark',
  'system',
];

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  const handleSelect = (value: 'light' | 'dark' | 'system') => {
    analytics.themeToggle(value);
    setTheme(value);
  };

  const cycleTheme = useCallback(() => {
    const currentIndex = cycleOrder.indexOf(theme);
    const next = cycleOrder[(currentIndex + 1) % cycleOrder.length];
    analytics.themeToggle(next);
    setTheme(next);
  }, [theme, setTheme]);

  useKeyboardShortcut('d', cycleTheme);

  return (
    <div
      className='inline-flex items-center gap-0.5 p-0.5 bg-surface-tertiary rounded-lg'
      role='radiogroup'
      aria-label='Theme (press D to cycle)'
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
      <span className='pl-0.5 pr-1'>
        <Kbd>D</Kbd>
      </span>
    </div>
  );
}
