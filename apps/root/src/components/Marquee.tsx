import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Seamless horizontal marquee. The track renders `items` twice and translates
 * -50%; because every item carries the same right margin, the loop is
 * seamless. Pauses on hover/focus, and is static under reduced motion
 * (see `.marquee-track` in theme.css).
 *
 * Accessibility: the first set is the real, focusable content; the second is a
 * decorative clone marked `inert` + `aria-hidden`, so links aren't duplicated
 * in the tab order or the accessibility tree. Edge fade via a mask.
 */
export function Marquee({
  items,
  className,
  itemClassName,
}: {
  items: ReactNode[];
  className?: string | undefined;
  itemClassName?: string | undefined;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]',
        className
      )}
    >
      <div className='marquee-track flex w-max hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]'>
        {items.map((item, i) => (
          <div key={`a-${i}`} className={cn('mr-8 shrink-0', itemClassName)}>
            {item}
          </div>
        ))}
        {items.map((item, i) => (
          <div
            key={`b-${i}`}
            className={cn('mr-8 shrink-0', itemClassName)}
            aria-hidden='true'
            inert
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
