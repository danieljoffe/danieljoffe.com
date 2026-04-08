import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes, type Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
  options: SelectOption[];
}

export function Select({
  label,
  error,
  helperText,
  success,
  options,
  className,
  id,
  required,
  ref,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;
  const describedBy = errorId || helperId;

  const getStateClasses = () => {
    if (error) return 'border-error focus-visible:ring-error';
    if (success) return 'border-success focus-visible:ring-success';
    return '';
  };

  return (
    <div className='w-full'>
      {label && (
        <label htmlFor={selectId} className='block text-text-primary mb-2'>
          {label}
          {required && <span className='text-error ml-1'>*</span>}
        </label>
      )}
      <div className='relative'>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(
            'w-full px-4 py-2.5 bg-surface border border-border rounded-md text-text-primary',
            'appearance-none focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-brand-500 focus-visible:border-transparent transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getStateClasses(),
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
      {helperText && !error && (
        <Text variant='helper' id={helperId} className='mt-1.5'>
          {helperText}
        </Text>
      )}
    </div>
  );
}
