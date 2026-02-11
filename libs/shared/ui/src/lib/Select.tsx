import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from './utils';

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
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={selectId} className='block text-foreground mb-2'>
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
              'w-full px-4 py-2.5 bg-input border border-input-border rounded-md text-foreground',
              'appearance-none focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-accent focus-visible:border-transparent transition-all',
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
            className='absolute right-3 top-1/2 -translate-y-1/2 size-5 text-foreground-subtle pointer-events-none'
            aria-hidden='true'
          />
        </div>
        {error && (
          <p id={errorId} className='mt-1.5 text-sm text-error' role='alert'>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
