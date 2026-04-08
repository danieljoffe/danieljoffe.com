import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import {
  BASE_FIELD,
  ERROR_TEXT,
  FIELD_ERROR,
  FIELD_PLACEHOLDER,
  FIELD_SUCCESS,
  FORM_LABEL,
  HELPER_TEXT,
  REQUIRED_MARK,
} from './styles/formStyles';
import { cn } from './utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, success, className, id, required, ...props },
    ref
  ) => {
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
            FIELD_PLACEHOLDER,
            getStateClasses(),
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className={ERROR_TEXT} role='alert'>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className={HELPER_TEXT}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
