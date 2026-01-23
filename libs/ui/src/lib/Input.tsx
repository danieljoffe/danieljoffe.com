import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const describedBy = errorId || helperId;

  return (
    <div className='w-full'>
      {label && (
        <label htmlFor={inputId} className='block text-foreground mb-2'>
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`w-full px-4 py-2.5 bg-input border border-input-border rounded-md text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all ${
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
