'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search,
  FileText,
  Briefcase,
  BookOpen,
  Wrench,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { buildSearchIndex, type SearchEntry } from '@/lib/searchIndex';
import { Z_INDEX } from '@/utils/constants';

const TYPE_ICONS: Record<SearchEntry['type'], typeof Search> = {
  project: FileText,
  experience: Briefcase,
  blog: BookOpen,
  service: Wrench,
  page: Globe,
};

const TYPE_LABELS: Record<SearchEntry['type'], string> = {
  project: 'Projects',
  experience: 'Experience',
  blog: 'Blog',
  service: 'Services',
  page: 'Pages',
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const index = useMemo(() => buildSearchIndex(), []);

  const grouped = useMemo(() => {
    const groups: Partial<Record<SearchEntry['type'], SearchEntry[]>> = {};
    for (const entry of index) {
      (groups[entry.type] ??= []).push(entry);
    }
    return groups;
  }, [index]);

  // Cmd+K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.classList.add('overflow-y-hidden');
    } else {
      document.body.classList.remove('overflow-y-hidden');
    }
    return () => document.body.classList.remove('overflow-y-hidden');
  }, [open]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm'
      style={{ zIndex: Z_INDEX.POPOVER }}
      onClick={() => setOpen(false)}
      data-testid='command-palette-overlay'
    >
      <div
        className='mx-auto mt-[20vh] w-full max-w-lg'
        onClick={e => e.stopPropagation()}
      >
        <Command
          className={cn(
            'rounded-xl border border-neutral-200 bg-white shadow-2xl',
            'dark:border-neutral-700 dark:bg-neutral-900'
          )}
          label='Command palette'
        >
          <div className='flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-700'>
            <Search className='h-4 w-4 shrink-0 text-neutral-400' />
            <Command.Input
              autoFocus
              placeholder='Search pages, posts, services…'
              className={cn(
                'w-full bg-transparent py-3 text-sm outline-none',
                'placeholder:text-neutral-400',
                'dark:text-white'
              )}
            />
            <kbd
              className={cn(
                'hidden shrink-0 rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline-block',
                'dark:border-neutral-600'
              )}
            >
              ESC
            </kbd>
          </div>

          <Command.List className='max-h-80 overflow-y-auto p-2'>
            <Command.Empty className='px-4 py-8 text-center text-sm text-neutral-400'>
              No results found.
            </Command.Empty>

            {(
              Object.entries(grouped) as [SearchEntry['type'], SearchEntry[]][]
            ).map(([type, entries]) => {
              const Icon = TYPE_ICONS[type];
              return (
                <Command.Group
                  key={type}
                  heading={TYPE_LABELS[type]}
                  className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-neutral-400'
                >
                  {entries.map(entry => (
                    <Command.Item
                      key={`${type}-${entry.slug}`}
                      value={`${entry.title} ${entry.excerpt} ${entry.tags.join(' ')}`}
                      onSelect={() => handleSelect(entry.url)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        'text-neutral-700 dark:text-neutral-300',
                        'data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-neutral-800'
                      )}
                    >
                      <Icon className='h-4 w-4 shrink-0 text-neutral-400' />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-medium'>{entry.title}</p>
                        <p className='truncate text-xs text-neutral-400'>
                          {entry.excerpt}
                        </p>
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
