'use client';

import { useCallback } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Kbd } from '@danieljoffe/shared-ui/Kbd';
import { useTheme } from '@/state/Theme/ThemeProvider';
import { analytics } from '@/lib/analytics';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

const cycleOrder: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = useCallback(() => {
    const currentIndex = cycleOrder.indexOf(theme);
    const next = cycleOrder[(currentIndex + 1) % cycleOrder.length];
    analytics.themeToggle(next);
    setTheme(next);
  }, [theme, setTheme]);

  useKeyboardShortcut('d', cycleTheme);

  const Icon = themeIcons[theme];
  const nextIndex = (cycleOrder.indexOf(theme) + 1) % cycleOrder.length;
  const nextLabel = cycleOrder[nextIndex];

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
      aria-label={`Switch to ${nextLabel} mode`}
      className='flex items-center gap-1.5 p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer'
    >
      <Icon className='h-4 w-4' aria-hidden='true' />
      <Kbd>D</Kbd>
    </button>
  );
}
