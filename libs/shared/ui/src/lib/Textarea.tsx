import { type TextareaHTMLAttributes, type Ref } from 'react';
import { Text } from './Text';
import { cn } from './utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export function Textarea({
  label,
  error,
  helperText,
  success,
  className,
  id,
  required,
  ref,
  ...props
}: TextareaProps) {
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
        <label htmlFor={textareaId} className='block text-text-primary mb-2'>
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
          'w-full px-4 py-2.5 bg-surface border border-border rounded-md',
          'text-text-primary placeholder:text-text-tertiary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'focus-visible:border-transparent transition-all resize-vertical',
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
