'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';

const PILL_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-text-primary hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

const PILL_ACTIVE_CLASS =
  'border-brand-500/60 bg-brand-500/10 text-text-primary';

interface JobsLocationFilterProps {
  only: string;
  exclude: string;
  onChange: (next: { only: string; exclude: string }) => void;
}

export default function JobsLocationFilter({
  only,
  exclude,
  onChange,
}: JobsLocationFilterProps) {
  const [open, setOpen] = useState(false);
  const [onlyDraft, setOnlyDraft] = useState(only);
  const [excludeDraft, setExcludeDraft] = useState(exclude);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const onlyId = useId();
  const excludeId = useId();

  // Sync drafts when parent filters change (e.g. tab switch clears them).
  useEffect(() => setOnlyDraft(only), [only]);
  useEffect(() => setExcludeDraft(exclude), [exclude]);

  function commit() {
    if (onlyDraft !== only || excludeDraft !== exclude) {
      onChange({ only: onlyDraft, exclude: excludeDraft });
    }
  }

  // Hold a ref to the latest commit so the outside-click listener can fire
  // without re-binding on every keystroke. Without this we'd either need
  // ``commit`` in the effect's deps (forcing a re-bind per render) or an
  // eslint-disable.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        commitRef.current();
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeCount = (only ? 1 : 0) + (exclude ? 1 : 0);
  const label =
    activeCount === 0
      ? 'Locations'
      : activeCount === 1
        ? 'Locations · 1'
        : 'Locations · 2';

  return (
    <div ref={wrapperRef} className='relative'>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn(PILL_CLASS, activeCount > 0 && PILL_ACTIVE_CLASS)}
      >
        <MapPin className='size-3.5 text-text-tertiary' aria-hidden />
        {label}
        <ChevronDown className='size-3 text-text-tertiary' aria-hidden />
      </button>
      {open && (
        <div
          role='dialog'
          aria-label='Filter by location'
          className='absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-elevated p-3 shadow-lg'
        >
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1'>
              <label
                htmlFor={onlyId}
                className='text-xs font-medium text-text-secondary'
              >
                Only show jobs in
              </label>
              <input
                id={onlyId}
                type='text'
                value={onlyDraft}
                onChange={e => setOnlyDraft(e.target.value)}
                onBlur={commit}
                placeholder='Remote, US'
                className='rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label
                htmlFor={excludeId}
                className='text-xs font-medium text-text-secondary'
              >
                Hide jobs in
              </label>
              <input
                id={excludeId}
                type='text'
                value={excludeDraft}
                onChange={e => setExcludeDraft(e.target.value)}
                onBlur={commit}
                placeholder='India, Brazil'
                className='rounded-md border border-border bg-surface-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
              />
            </div>
            <p className='text-[11px] text-text-tertiary'>
              Comma-separated. Case-insensitive substring match against the
              job&apos;s location.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
