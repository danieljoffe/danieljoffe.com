import { Check } from 'lucide-react';
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { DISABLED_PEER, FOCUS_RING_PEER } from './styles/formStyles';
import { cn } from './utils';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label?: string | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, checked, ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id ?? generatedId;

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
          <span
            aria-hidden='true'
            onClick={() => document.getElementById(checkboxId)?.click()}
            className={cn(
              'flex items-center justify-center size-5 border-2',
              'border-border-secondary rounded bg-surface cursor-pointer transition-all',
              'peer-checked:bg-brand-500 peer-checked:border-brand-500',
              FOCUS_RING_PEER,
              DISABLED_PEER,
              className
            )}
          >
            {checked && (
              <Check
                className='size-3.5 text-text-inverse'
                strokeWidth={3}
                aria-hidden='true'
              />
            )}
          </span>
        </div>
        {label && (
          <label
            htmlFor={checkboxId}
            className='text-text-primary cursor-pointer select-none'
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
