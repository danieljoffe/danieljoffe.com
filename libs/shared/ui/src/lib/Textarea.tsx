import { forwardRef, type TextareaHTMLAttributes } from 'react';
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

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helperText, success, className, id, required, ...props },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText && !error ? `${textareaId}-helper` : undefined;
    const describedBy = errorId || helperId;

    const getStateClasses = () => {
      if (error) return FIELD_ERROR;
      if (success) return FIELD_SUCCESS;
      return '';
    };

    return (
      <div className='w-full'>
        {label && (
          <label htmlFor={textareaId} className={FORM_LABEL}>
            {label}
            {required && <span className={REQUIRED_MARK}>*</span>}
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
            BASE_FIELD,
            FIELD_PLACEHOLDER,
            'resize-vertical',
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

Textarea.displayName = 'Textarea';
