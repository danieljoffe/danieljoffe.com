import { Check } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label?: string;
}

export function Checkbox({
  label,
  className = '',
  id,
  checked,
  ...props
}: CheckboxProps) {
  const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className='flex items-center gap-2'>
      <div className='relative'>
        <input
          type='checkbox'
          id={checkboxId}
          checked={checked}
          className='peer sr-only'
          {...props}
        />
        <label
          htmlFor={checkboxId}
          aria-hidden='true'
          className={`flex items-center justify-center w-5 h-5 border-2 border-border-strong rounded bg-input cursor-pointer transition-all peer-checked:bg-accent peer-checked:border-accent peer-focus:ring-2 peer-focus:ring-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background ${className}`}
        >
          {checked && (
            <Check
              className='w-3.5 h-3.5 text-accent-foreground'
              strokeWidth={3}
              aria-hidden='true'
            />
          )}
        </label>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className='text-foreground cursor-pointer select-none'
        >
          {label}
        </label>
      )}
    </div>
  );
}
