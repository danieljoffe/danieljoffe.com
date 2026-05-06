import { cn } from '@/lib/cn';
import { STATUS_DOT_CLASS, formatStatus, type JobStatus } from './types';

interface StatusIndicatorProps {
  status: string;
  className?: string;
}

export default function StatusIndicator({
  status,
  className,
}: StatusIndicatorProps) {
  const dotClass = STATUS_DOT_CLASS[status as JobStatus] ?? 'bg-text-tertiary';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap text-sm',
        className
      )}
    >
      <span
        className={cn('inline-block size-2 shrink-0 rounded-full', dotClass)}
        aria-hidden
      />
      <span className='capitalize'>{formatStatus(status)}</span>
    </span>
  );
}
