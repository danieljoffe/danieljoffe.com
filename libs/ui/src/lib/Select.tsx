import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
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
          id={selectId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={`w-full px-4 py-2.5 bg-input border border-input-border rounded-md text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all ${
            error ? 'border-error focus:ring-error' : ''
          } ${className}`}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className='absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle pointer-events-none'
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
