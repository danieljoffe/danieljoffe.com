import { Check } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './utils';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label?: string | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className='flex items-center gap-2'>
        <div className='relative'>
          <input
            ref={ref}
            type='checkbox'
            id={checkboxId}
            checked={checked}
            className='peer sr-only'
            {...props}
          />
          <label
            htmlFor={checkboxId}
            aria-hidden='true'
            className={cn(
              'flex items-center justify-center size-5 border-2',
              'border-border-strong rounded bg-input cursor-pointer transition-all',
              'peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-2',
              'peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 ',
              'peer-focus-visible:ring-offset-background',
              className
            )}
          >
            {checked && (
              <Check
                className='size-3.5 text-accent-foreground'
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
);
Checkbox.displayName = 'Checkbox';
