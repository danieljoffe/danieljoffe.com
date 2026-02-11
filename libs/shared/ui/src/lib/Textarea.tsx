import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helperText, success, className, id, required, ...props },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText && !error ? `${textareaId}-helper` : undefined;
    const describedBy = errorId || helperId;

    const getStateClasses = () => {
      if (error) return 'border-error focus-visible:ring-error';
      if (success) return 'border-success focus-visible:ring-success';
      return '';
    };

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={textareaId} className='block text-foreground mb-2'>
            {label}
            {required && <span className='text-error ml-1'>*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(
            'w-full px-4 py-2.5 bg-input border border-input-border rounded-md',
            'text-foreground placeholder:text-foreground-subtle',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'focus-visible:border-transparent transition-all resize-vertical',
            getStateClasses(),
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className='mt-1.5 text-sm text-error' role='alert'>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className='mt-1.5 text-sm text-foreground-subtle'>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
