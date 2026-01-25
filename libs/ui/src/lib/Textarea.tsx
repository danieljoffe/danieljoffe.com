import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${textareaId}-error` : undefined;
  const helperId = helperText && !error ? `${textareaId}-helper` : undefined;
  const describedBy = errorId || helperId;

  return (
    <div className='w-full'>
      {label && (
        <label htmlFor={textareaId} className='block text-foreground mb-2'>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`w-full px-4 py-2.5 bg-input border border-input-border rounded-md text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all resize-none ${
          error ? 'border-error focus:ring-error' : ''
        } ${className}`}
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
