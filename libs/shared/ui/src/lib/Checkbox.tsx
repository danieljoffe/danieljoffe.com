import { Check } from 'lucide-react';
import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { DISABLED_PEER, FOCUS_RING_PEER } from './styles/formStyles';
import { Text } from './Text';
import { cn } from './utils';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  ref?: Ref<HTMLInputElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
}

export function Checkbox({
  label,
  error,
  className,
  id,
  checked,
  ref,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <div>
      <div className='flex items-center gap-2'>
        <div className='relative'>
          <input
            ref={ref}
            type='checkbox'
            id={checkboxId}
            checked={checked}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className='peer sr-only'
            {...props}
          />
          <span
            aria-hidden='true'
            onClick={() => document.getElementById(checkboxId)?.click()}
            className={cn(
              'flex items-center justify-center size-5 border-2',
              'border-border-secondary rounded-xs bg-surface cursor-pointer transition-all',
              'peer-checked:bg-brand-500 peer-checked:border-brand-500',
              FOCUS_RING_PEER,
              DISABLED_PEER,
              error && 'border-error',
              className
            )}
          >
            {checked && (
              <Check
                className='size-3.5 text-text-inverse'
                strokeWidth={3}
                aria-hidden='true'
              />
            )}
          </span>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-text-primary select-none',
              props.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            )}
          >
            {label}
          </label>
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
