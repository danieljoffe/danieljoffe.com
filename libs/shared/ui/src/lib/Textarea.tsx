import { type TextareaHTMLAttributes, type Ref } from 'react';
import {
  BASE_FIELD,
  DISABLED,
  FIELD_ERROR,
  FIELD_PADDING,
  FIELD_PLACEHOLDER,
  FIELD_SUCCESS,
  FORM_LABEL,
  REQUIRED_MARK,
} from './styles/formStyles';
import { Text } from './Text';
import { cn } from './utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: Ref<HTMLTextAreaElement> | undefined;
  label?: string | undefined;
  error?: string | undefined;
  helperText?: string | undefined;
  success?: boolean | undefined;
}

export function Textarea({
  label,
  error,
  helperText,
  success,
  className,
  id,
  required,
  ref,
  ...props
}: TextareaProps) {
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
          FIELD_PADDING,
          FIELD_PLACEHOLDER,
          'resize-vertical',
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
