'use client';

import { ChevronDown } from 'lucide-react';
import {
  useCallback,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from './utils';

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
}

export interface AccordionProps {
  ref?: Ref<HTMLDivElement> | undefined;
  items: AccordionItem[];
  /** Allow several panels open at once. `false` enforces classic single-open. */
  allowMultiple?: boolean;
  onToggle?: ((id: string, open: boolean) => void) | undefined;
  className?: string | undefined;
  /** Heading level of the header rows, to fit the surrounding outline. */
  headingLevel?: 2 | 3 | 4;
}

/**
 * Collapsible sections following the WAI-ARIA Accordion pattern: each header
 * is a button (in a heading) that toggles a labelled region, with arrow-key
 * navigation between headers.
 */
export function Accordion({
  items,
  allowMultiple = true,
  onToggle,
  className,
  headingLevel = 3,
  ref,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const defaults = items.filter(item => item.defaultOpen).map(i => i.id);
    return new Set(allowMultiple ? defaults : defaults.slice(0, 1));
  });
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const headerId = (id: string) => `${baseId}-header-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const toggle = useCallback(
    (id: string) => {
      const willOpen = !openIds.has(id);
      setOpenIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (!allowMultiple) next.clear();
          next.add(id);
        }
        return next;
      });
      onToggle?.(id, willOpen);
    },
    [openIds, allowMultiple, onToggle]
  );

  const enabledIndexes = items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i);
    return acc;
  }, []);

  const handleHeaderKeyDown = (e: KeyboardEvent, index: number) => {
    const position = enabledIndexes.indexOf(index);
    let nextIndex: number | undefined;

    switch (e.key) {
      case 'ArrowDown':
        nextIndex = enabledIndexes[(position + 1) % enabledIndexes.length];
        break;
      case 'ArrowUp':
        nextIndex =
          enabledIndexes[
            (position - 1 + enabledIndexes.length) % enabledIndexes.length
          ];
        break;
      case 'Home':
        nextIndex = enabledIndexes[0];
        break;
      case 'End':
        nextIndex = enabledIndexes[enabledIndexes.length - 1];
        break;
      default:
        return;
    }

    if (nextIndex != null) {
      e.preventDefault();
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        'w-full divide-y divide-border overflow-hidden rounded-lg border border-border',
        className
      )}
    >
      {items.map((item, i) => {
        const open = openIds.has(item.id);
        return (
          <div key={item.id}>
            <div role='heading' aria-level={headingLevel}>
              <button
                ref={el => {
                  buttonRefs.current[i] = el;
                }}
                type='button'
                id={headerId(item.id)}
                aria-expanded={open}
                aria-controls={open ? panelId(item.id) : undefined}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                onKeyDown={e => handleHeaderKeyDown(e, i)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-4 py-3 text-left',
                  'text-text-primary transition-colors hover:bg-surface-tertiary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                  item.disabled &&
                    'opacity-50 cursor-not-allowed hover:bg-transparent'
                )}
              >
                <span className='flex-1'>{item.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-text-secondary',
                    'transition-transform motion-reduce:transition-none',
                    open && 'rotate-180'
                  )}
                  aria-hidden='true'
                />
              </button>
            </div>
            {open && (
              <div
                role='region'
                id={panelId(item.id)}
                aria-labelledby={headerId(item.id)}
                className='px-4 pb-4 text-text-secondary'
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
