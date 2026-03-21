import { cn } from '@/lib/cn';

const sizeStyles = {
  sm: 'size-4 border-2',
  md: 'size-8 border-4',
} as const;

export function Spinner({
  size = 'md',
  label = 'Loading',
  className,
}: {
  size?: keyof typeof sizeStyles;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role='status'
      className={cn(
        'inline-block rounded-full animate-spin border-brand-500/30 border-t-brand-500',
        sizeStyles[size],
        className
      )}
    >
      <span className='sr-only'>{label}</span>
    </span>
  );
}
