import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import {
  BASE_FIELD,
  ERROR_TEXT,
  FIELD_ERROR,
  FORM_LABEL,
} from './styles/formStyles';
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
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={selectId} className={FORM_LABEL}>
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
              BASE_FIELD,
              'appearance-none',
              error && FIELD_ERROR,
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
          <p id={errorId} className={ERROR_TEXT} role='alert'>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
