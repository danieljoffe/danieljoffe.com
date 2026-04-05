import { cn } from './utils/cn';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const base = 'animate-pulse bg-surface-tertiary';

  if (variant === 'circular') {
    return (
      <div
        className={cn(base, 'rounded-full', className)}
        style={{
          width: width || 40,
          height: height || width || 40,
        }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(base, 'rounded-lg', className)}
        style={{ width: width || '100%', height: height || 120 }}
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
            'h-4 rounded',
            i === lines - 1 && lines > 1 && 'w-3/4'
          )}
          style={{ height }}
        />
      ))}
    </div>
  );
}
