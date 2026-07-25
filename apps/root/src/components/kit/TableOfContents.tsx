'use client';

import { useCallback, useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { Modal } from '@danieljoffe/shared-ui/Modal';
import { cn } from '@/lib/cn';

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

    // Scroll-position-derived spy instead of an IntersectionObserver: the
    // active section is the last heading above the reading line, falling
    // back to the first heading when the viewport is above all sections.
    // The observer version only updated when a heading crossed its band, so
    // it highlighted nothing on load and stayed stuck on the last section
    // after scrolling back to the top.
    //
    // Must clear the scroll-margin headings land at after a TOC click
    // (scroll-mt puts them ~166px down), or the clicked section would
    // never register as active.
    const READING_LINE_PX = 180;

    let ticking = false;
    const update = () => {
      ticking = false;
      let current = items[0]?.id ?? '';
      for (const { id } of items) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= READING_LINE_PX) {
          current = id;
        }
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    queueMicrotask(() => {
      setHeadings(items);
      update();
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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
            aria-current={activeId === id ? 'location' : undefined}
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

  const handleSelect = useCallback((id: string) => {
    setIsOpen(false);
    // Small delay so the sheet starts closing before scrolling
    requestAnimationFrame(() => scrollToHeading(id));
  }, []);

  return (
    <div className='lg:hidden'>
      {/* FAB — while the sheet is open it sits under the Modal backdrop, so
          clicking its spot dismisses via the backdrop; Modal returns focus
          here on close. */}
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        aria-label={
          isOpen ? 'Close table of contents' : 'Open table of contents'
        }
        aria-expanded={isOpen}
        className='fixed bottom-20 md:bottom-6 left-6 z-40 flex items-center justify-center size-10 rounded-full bg-surface-elevated border border-brand-500/20 shadow-lg text-text-primary hover:border-brand-500/40 hover:bg-brand-500/5 transition-all duration-200 cursor-pointer'
      >
        <List className='size-4' aria-hidden='true' />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement='sheet'
        aria-label='Table of contents'
        className='max-w-none rounded-t-2xl border-t border-border max-h-[60vh]'
        bodyClassName='px-6 py-5'
      >
        <span className='text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 block'>
          On this page
        </span>
        <TocList
          headings={headings}
          activeId={activeId}
          onSelect={handleSelect}
        />
      </Modal>
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
