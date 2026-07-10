'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { type HTMLAttributes, type Ref } from 'react';
import { useTheme } from './ThemeProvider';
import { cn } from './utils/cn';

export interface ThemeToggleProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {
  ref?: Ref<HTMLDivElement> | undefined;
  className?: string;
}

export function ThemeToggle({ className, ref, ...rest }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center gap-0.5 p-0.5 bg-surface-tertiary rounded-lg',
        className
      )}
      {...rest}
    >
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
