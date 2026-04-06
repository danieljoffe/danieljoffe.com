'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  /** CSS selector for the container to scan for headings */
  contentSelector?: string;
  /** Render only the mobile FAB + bottom sheet */
  mobile?: boolean;
  /** Render only the desktop sticky sidebar */
  desktop?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Shared: heading extraction + active-section observer               */
/* ------------------------------------------------------------------ */

function useHeadings(contentSelector: string) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const elements = container.querySelectorAll('h2, h3');
    const items: TocItem[] = [];

    elements.forEach(el => {
      if (el.id && el.textContent) {
        items.push({
          id: el.id,
          text: el.textContent,
          level: el.tagName === 'H2' ? 2 : 3,
        });
      }
    });

    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    queueMicrotask(() => setHeadings(items));

    return () => observer.disconnect();
  }, [contentSelector]);

  return { headings, activeId };
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Shared: TOC link list                                              */
/* ------------------------------------------------------------------ */

function TocList({
  headings,
  activeId,
  onSelect,
}: {
  headings: TocItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className='flex flex-col gap-1'>
      {headings.map(({ id, text, level }) => (
        <li key={id}>
          <button
            type='button'
            onClick={() => onSelect(id)}
            className={cn(
              'text-left text-xs leading-relaxed py-0.5 transition-colors',
              'cursor-pointer hover:text-text-primary w-full',
              level === 3 && 'pl-4',
              activeId === id
                ? 'text-brand-500 font-medium'
                : 'text-text-tertiary'
            )}
          >
            {text}
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop: sticky sidebar                                            */
/* ------------------------------------------------------------------ */

function DesktopToc({
  headings,
  activeId,
}: {
  headings: TocItem[];
  activeId: string;
}) {
  const handleSelect = useCallback((id: string) => {
    scrollToHeading(id);
  }, []);

  return (
    <nav
      aria-label='Table of contents'
      className='hidden lg:block sticky top-24 self-start w-full shrink-0'
    >
      <span className='text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 block'>
        On this page
      </span>
      <TocList
        headings={headings}
        activeId={activeId}
        onSelect={handleSelect}
      />
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile: FAB + bottom sheet                                         */
/* ------------------------------------------------------------------ */

function MobileToc({
  headings,
  activeId,
}: {
  headings: TocItem[];
  activeId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useFocusTrap(isOpen) as React.RefObject<HTMLDivElement>;
  const fabRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelect = useCallback((id: string) => {
    setIsOpen(false);
    // Small delay so the sheet closes before scrolling
    requestAnimationFrame(() => scrollToHeading(id));
  }, []);

  return (
    <div className='lg:hidden'>
      {/* FAB */}
      <button
        ref={fabRef}
        type='button'
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={
          isOpen ? 'Close table of contents' : 'Open table of contents'
        }
        aria-expanded={isOpen}
        className='fixed bottom-20 md:bottom-6 left-6 z-40 flex items-center justify-center size-10 rounded-full bg-surface-elevated border border-brand-500/20 shadow-lg text-text-primary hover:border-brand-500/40 hover:bg-brand-500/5 transition-all duration-200 cursor-pointer'
      >
        <List className='size-4' aria-hidden='true' />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className='fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] transition-opacity'
          onClick={() => setIsOpen(false)}
          aria-hidden='true'
        />
      )}

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        role='dialog'
        aria-label='Table of contents'
        aria-modal={isOpen}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-51 bg-surface border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[60vh] overflow-y-auto px-6 py-5',
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
      >
        <span className='text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 block'>
          On this page
        </span>
        <TocList
          headings={headings}
          activeId={activeId}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

export function TableOfContents({
  contentSelector = 'article',
  mobile,
  desktop,
}: TableOfContentsProps) {
  const { headings, activeId } = useHeadings(contentSelector);

  if (headings.length === 0) return null;

  const showDesktop = desktop || (!mobile && !desktop);
  const showMobile = mobile || (!mobile && !desktop);

  return (
    <>
      {showDesktop && <DesktopToc headings={headings} activeId={activeId} />}
      {showMobile && <MobileToc headings={headings} activeId={activeId} />}
    </>
  );
}
