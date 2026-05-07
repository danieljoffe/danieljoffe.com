import { ChevronDown } from 'lucide-react';
import { useId, type SelectHTMLAttributes, type Ref } from 'react';
import {
  BASE_FIELD,
  DISABLED,
  FIELD_ERROR,
  FIELD_SUCCESS,
  FORM_LABEL,
  REQUIRED_MARK,
} from './styles/formStyles';
import { Text } from './Text';
import type { ComponentSize } from './types';
import { cn } from './utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size'
> {
  ref?: Ref<HTMLSelectElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
  size?: ComponentSize;
  options: SelectOption[];
}

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'px-3 py-1.5 pr-8 text-sm',
  md: 'px-4 py-2.5 pr-10',
  lg: 'px-5 py-3 pr-12 text-lg',
};

export function Select({
  label,
  error,
  helperText,
  success,
  size = 'md',
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
    if (error) return FIELD_ERROR;
    if (success) return FIELD_SUCCESS;
    return '';
  };

  return (
    <div className='w-full'>
      {label && (
        <label htmlFor={selectId} className={FORM_LABEL}>
          {label}
          {required && <span className={REQUIRED_MARK}>*</span>}
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
            BASE_FIELD,
            sizeStyles[size],
            'appearance-none',
            DISABLED,
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
