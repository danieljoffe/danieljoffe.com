import type { ComponentSize } from './types';
import { cn } from './utils/cn';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  size?: ComponentSize;
}

const textLineSizeStyles: Record<ComponentSize, string> = {
  sm: 'h-3',
  md: 'h-4',
  lg: 'h-5',
};

const circularSizeDefaults: Record<ComponentSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
};

const rectangularHeightDefaults: Record<ComponentSize, number> = {
  sm: 80,
  md: 120,
  lg: 180,
};

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  size = 'md',
}: SkeletonProps) {
  const base = 'animate-pulse motion-reduce:animate-none bg-surface-tertiary';

  if (variant === 'circular') {
    const defaultSize = circularSizeDefaults[size];
    return (
      <div
        className={cn(base, 'rounded-full', className)}
        style={{
          width: width || defaultSize,
          height: height || width || defaultSize,
        }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(base, 'rounded-lg', className)}
        style={{
          width: width || '100%',
          height: height || rectangularHeightDefaults[size],
        }}
      />
    );
  }

  return (
    <div className={cn('space-y-2', className)} style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            base,
            textLineSizeStyles[size],
            'rounded-xs',
            i === lines - 1 && lines > 1 && 'w-3/4'
          )}
          style={{ height }}
        />
      ))}
    </div>
  );
}
