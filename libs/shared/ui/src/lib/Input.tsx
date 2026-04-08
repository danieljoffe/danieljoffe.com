import { useId, type InputHTMLAttributes, type Ref } from 'react';
import {
  BASE_FIELD,
  DISABLED,
  FIELD_ERROR,
  FIELD_PLACEHOLDER,
  FIELD_SUCCESS,
  FORM_LABEL,
  REQUIRED_MARK,
} from './styles/formStyles';
import { Text } from './Text';
import type { ComponentSize } from './types';
import { cn } from './utils';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  ref?: Ref<HTMLInputElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
  size?: ComponentSize;
}

const sizeStyles: Record<ComponentSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5',
  lg: 'px-5 py-3 text-lg',
};

export function Input({
  label,
  error,
  helperText,
  success,
  size = 'md',
  className,
  id,
  required,
  ref,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const describedBy = errorId || helperId;

  const getStateClasses = () => {
    if (error) return FIELD_ERROR;
    if (success) return FIELD_SUCCESS;
    return '';
  };

  return (
    <div className='w-full'>
      {label && (
        <label htmlFor={inputId} className={FORM_LABEL}>
          {label}
          {required && <span className={REQUIRED_MARK}>*</span>}
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
          BASE_FIELD,
          sizeStyles[size],
          FIELD_PLACEHOLDER,
          DISABLED,
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
