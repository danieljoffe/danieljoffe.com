'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  type ReactNode,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { cn } from './utils';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  ref?: Ref<HTMLDivElement> | undefined;
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string | undefined;
}

const positionStyles: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  ref,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    },
    [hideTooltip]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        role='presentation'
        aria-describedby={tooltipId}
      >
        {children}
      </div>
      <div
        id={tooltipId}
        role='tooltip'
        className={cn(
          'absolute z-50 px-3 py-1.5 bg-surface-elevated border',
          'border-border-secondary rounded-md text-sm text-text-primary',
          'whitespace-nowrap pointer-events-none transition-opacity duration-150',
          positionStyles[position],
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
      >
        {content}
      </div>
    </div>
  );
}
