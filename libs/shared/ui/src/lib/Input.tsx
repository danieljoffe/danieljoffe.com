import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from './utils';
import { Text } from './Text';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, success, className, id, required, ...props },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;
    const describedBy = errorId || helperId;

    const getStateClasses = () => {
      if (error) return 'border-error focus-visible:ring-error';
      if (success) return 'border-success focus-visible:ring-success';
      return '';
    };

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={inputId} className='block text-text-primary mb-2'>
            {label}
            {required && <span className='text-error ml-1'>*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(
            'w-full px-4 py-2.5 bg-surface border border-border rounded-md',
            'text-text-primary placeholder:text-text-tertiary focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent',
            'transition-all',
            getStateClasses(),
            className
          )}
          {...props}
        />
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
);

Input.displayName = 'Input';
