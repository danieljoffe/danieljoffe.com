import { forwardRef, useId } from 'react';
import { cn } from './utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | undefined;
  disabled?: boolean;
  className?: string | undefined;
  id?: string | undefined;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, disabled = false, className, id }, ref) => {
    const generatedId = useId();
    const resolvedId = id || generatedId;
    const labelId = label ? `${resolvedId}-label` : undefined;

    return (
      <div className='flex items-center gap-2'>
        <button
          ref={ref}
          type='button'
          role='switch'
          id={resolvedId}
          aria-checked={checked}
          aria-labelledby={labelId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            checked ? 'bg-accent' : 'bg-border-strong',
            className
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-background transition-transform',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        {label && (
          <span id={labelId} className='text-foreground select-none'>
            {label}
          </span>
        )}
      </div>
    );
  }
);
Switch.displayName = 'Switch';
