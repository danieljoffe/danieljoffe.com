'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  /** CSS selector for the container to scan for headings */
  contentSelector?: string;
}

export function TableOfContents({
  contentSelector = 'article',
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Extract headings from the DOM and observe for active section highlighting
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

    // Set headings last via microtask to avoid synchronous setState in effect body
    queueMicrotask(() => setHeadings(items));

    return () => observer.disconnect();
  }, [contentSelector]);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    setIsOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  return (
    <nav aria-label='Table of contents' className='mb-8'>
      {/* Mobile: collapsible disclosure */}
      <button
        type='button'
        onClick={() => setIsOpen(prev => !prev)}
        className='flex items-center gap-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider md:hidden'
        aria-expanded={isOpen}
      >
        <svg
          className={cn(
            'size-3.5 transition-transform',
            isOpen && 'rotate-90'
          )}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          strokeWidth={2}
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M9 5l7 7-7 7'
          />
        </svg>
        On this page
      </button>

      {/* Desktop: always-visible label */}
      <span className='hidden md:block text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3'>
        On this page
      </span>

      {/* TOC list */}
      <ul
        className={cn(
          'flex flex-col gap-1 mt-2 md:mt-0',
          // Mobile: hidden until expanded
          !isOpen && 'hidden md:flex'
        )}
      >
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <button
              type='button'
              onClick={() => handleClick(id)}
              className={cn(
                'text-left text-xs leading-relaxed py-0.5 transition-colors hover:text-text-primary',
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
    </nav>
  );
}
