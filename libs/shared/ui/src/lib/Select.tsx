import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from './utils';
import { Text } from './Text';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string | undefined;
  error?: string | undefined;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={selectId} className='block text-text-primary mb-2'>
            {label}
          </label>
        )}
        <div className='relative'>
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorId}
            className={cn(
              'w-full px-4 py-2.5 bg-surface border border-border rounded-md text-text-primary',
              'appearance-none focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-brand-500 focus-visible:border-transparent transition-all',
              error && 'border-error focus-visible:ring-error',
              className
            )}
            {...props}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className='absolute right-3 top-1/2 -translate-y-1/2 size-5 text-text-tertiary pointer-events-none'
            aria-hidden='true'
          />
        </div>
        {error && (
          <Text variant='error' id={errorId} className='mt-1.5' role='alert'>
            {error}
          </Text>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
