'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

const GAP = 26; // dot spacing in CSS px
const BASE_RADIUS = 1.1; // resting dot radius
const INFLUENCE = 130; // cursor influence radius
const DOT_RGB = '99, 102, 241'; // indigo-500 — reads on both light and dark
const BASE_ALPHA = 0.07;
const PEAK_ALPHA = 0.5;

/**
 * Decorative hero backdrop: a slow brand-tinted glow plus a faint dot grid that
 * lights up around the cursor. Purely ambient (`pointer-events-none`,
 * `aria-hidden`) and reduced-motion aware — when motion is not wanted it draws a
 * single static frame and never attaches the pointer listener or animates.
 *
 * Perf: the canvas redraws only on pointer movement near the hero (coalesced to
 * one draw per frame), not on a continuous RAF loop.
 */
export function HeroBackdrop({
  className,
}: {
  className?: string | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let drawScheduled = false;
    const pointer = { x: 0, y: 0, active: false };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cols = Math.ceil(width / GAP);
      const rows = Math.ceil(height / GAP);
      const offX = (width - (cols - 1) * GAP) / 2;
      const offY = (height - (rows - 1) * GAP) / 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offX + i * GAP;
          const y = offY + j * GAP;
          let t = 0;
          if (pointer.active) {
            const dist = Math.hypot(x - pointer.x, y - pointer.y);
            if (dist < INFLUENCE) t = 1 - dist / INFLUENCE;
          }
          ctx.beginPath();
          ctx.arc(x, y, BASE_RADIUS + t * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${DOT_RGB}, ${BASE_ALPHA + t * (PEAK_ALPHA - BASE_ALPHA)})`;
          ctx.fill();
        }
      }
    };

    const scheduleDraw = () => {
      if (drawScheduled) return;
      drawScheduled = true;
      frame = requestAnimationFrame(() => {
        drawScheduled = false;
        draw();
      });
    };

    const layout = () => {
      // Full-bleed to the page: span the document content width (excludes the
      // scrollbar) anchored at the viewport's left edge, while staying as tall
      // as the hero. Sizing in JS — rather than 100vw — keeps it perfectly
      // flush and never adds a horizontal scrollbar.
      const root = canvas.parentElement;
      const host = root?.parentElement;
      if (root && host) {
        root.style.left = `${-host.getBoundingClientRect().left}px`;
        root.style.width = `${document.documentElement.clientWidth}px`;
      }
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const near =
        x > -INFLUENCE &&
        x < width + INFLUENCE &&
        y > -INFLUENCE &&
        y < height + INFLUENCE;
      if (near) {
        pointer.x = x;
        pointer.y = y;
        pointer.active = true;
        scheduleDraw();
      } else if (pointer.active) {
        pointer.active = false;
        scheduleDraw();
      }
    };

    const onLeave = () => {
      if (!pointer.active) return;
      pointer.active = false;
      scheduleDraw();
    };

    // Re-layout when the viewport width changes (incl. scrollbar show/hide).
    // Observing the root element — not the canvas — avoids a feedback loop,
    // since resizing the (absolute, clipped) backdrop never changes its size.
    const observer = new ResizeObserver(layout);
    observer.observe(document.documentElement);
    layout();

    if (!reduce) {
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden='true'
      className={cn(
        // `inset-0` is the pre-hydration fallback; once mounted, the effect
        // resizes this element to full page width (see `layout`).
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
    >
      <div className='hero-glow absolute -top-32 left-1/2 -ml-[380px] h-[440px] w-[760px] rounded-full bg-brand-500/10 blur-3xl' />
      <canvas ref={canvasRef} className='absolute inset-0 h-full w-full' />
    </div>
  );
}
