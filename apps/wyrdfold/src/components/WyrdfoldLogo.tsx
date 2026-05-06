import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

interface WyrdfoldLogoProps {
  className?: string;
  size?: number;
  color?: string;
  'aria-label'?: string;
}

function WyrdfoldLogo({
  className,
  size = 24,
  color,
  'aria-label': ariaLabel = 'Wyrdfold',
}: WyrdfoldLogoProps) {
  const style: CSSProperties | undefined = color ? { color } : undefined;

  return (
    <svg
      role='img'
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox='0 0 680 510'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('text-brand-300', className)}
      style={style}
    >
      <title>{ariaLabel}</title>
      <path
        d='M0 0.0161135H183.078L340.002 510L0 0.0161135Z'
        fill='currentColor'
      />
      <path d='M340 0.0161135V510L496.924 0.0161135H340Z' fill='currentColor' />
      <path
        d='M625.078 2.22777e-05L339.999 509.984L680 0L625.078 2.22777e-05Z'
        fill='currentColor'
      />
    </svg>
  );
}

export default WyrdfoldLogo;
