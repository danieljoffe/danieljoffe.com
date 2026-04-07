import { useId, type Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

export interface SwitchProps {
  ref?: Ref<HTMLButtonElement> | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
  className?: string | undefined;
  id?: string | undefined;
}

export function Switch({
  checked,
  onChange,
  label,
  error,
  disabled = false,
  className,
  id,
  ref,
}: SwitchProps) {
  const generatedId = useId();
  const resolvedId = id || generatedId;
  const labelId = label ? `${resolvedId}-label` : undefined;
  const errorId = error ? `${resolvedId}-error` : undefined;

  return (
    <div>
      <div className='flex items-center gap-2'>
        <button
          ref={ref}
          type='button'
          role='switch'
          id={resolvedId}
          aria-checked={checked}
          aria-invalid={error ? 'true' : undefined}
          aria-labelledby={labelId}
          aria-describedby={errorId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            checked ? 'bg-brand-500' : 'bg-border-strong',
            error && 'ring-1 ring-error',
            className
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-surface transition-transform motion-reduce:transition-none',
              checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        {label && (
          <span id={labelId} className='text-text-primary select-none'>
            {label}
          </span>
        )}
      </div>
      {error && (
        <Text variant='error' id={errorId} className='mt-1.5' role='alert'>
          {error}
        </Text>
      )}
    </div>
  );
}
