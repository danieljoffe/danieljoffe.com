import React from 'react';
import { Input, Textarea } from '@danieljoffe.com/ui';
import { TextInputProps } from './textInput.types';
import { devLog } from '@/utils/helpers';

const TextInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  TextInputProps
>(
  (
    {
      label,
      error,
      hint,
      success,
      disabled,
      id,
      className = '',
      required = false,
      as = 'input',
      ...props
    },
    ref
  ) => {
    if (
      (label == null || label === '') &&
      (
        props as React.InputHTMLAttributes<HTMLInputElement> &
          React.TextareaHTMLAttributes<HTMLTextAreaElement>
      )['aria-label'] == null
    ) {
      devLog('TextInput: Accessible label is required (label or aria-label).');
    }

    // Map hint to helperText for UI library components
    const helperText = hint;

    if (as === 'textarea') {
      return (
        <Textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={id}
          label={label}
          error={error}
          helperText={helperText}
          success={success}
          disabled={disabled}
          required={required}
          className={className}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    }

    return (
      <Input
        ref={ref as React.Ref<HTMLInputElement>}
        id={id}
        label={label}
        error={error}
        helperText={helperText}
        success={success}
        disabled={disabled}
        required={required}
        className={className}
        {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;
