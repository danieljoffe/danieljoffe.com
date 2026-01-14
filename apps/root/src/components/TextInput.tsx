import React from 'react';
import TextInputFeedback from './InputFeedback';
import InputLabel from './InputLabel';
import { TextInputProps } from './textInput.types';
import {
  stateStyles,
  textAreaBaseStyles,
  baseStyles,
} from './textInput.constants';
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
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const controlId = props.name ? `${props.name}-${inputId}` : inputId;
    let stateClass = stateStyles.default;

    if (
      (label == null || label === '') &&
      (
        props as React.InputHTMLAttributes<HTMLInputElement> &
          React.TextareaHTMLAttributes<HTMLTextAreaElement>
      )['aria-label'] == null
    ) {
      devLog('TextInput: Accessible label is required (label or aria-label).');
    }

    if (disabled) {
      stateClass = stateStyles.disabled;
    } else if (error) {
      stateClass = stateStyles.error;
    } else if (success) {
      stateClass = stateStyles.success;
    }

    const baseProps = {
      ref: ref as React.Ref<HTMLInputElement | HTMLTextAreaElement>,
      id: controlId,
      className: [
        as === 'textarea' ? textAreaBaseStyles : baseStyles,
        stateClass,
        className,
      ]
        .filter(Boolean)
        .join(' '),
      'aria-invalid': !!error,
      'aria-required': required || undefined,
      'aria-describedby': error
        ? `${inputId}-error`
        : hint
        ? `${inputId}-hint`
        : undefined,
      disabled,
      required,
      ...props,
    };

    return (
      <div className='w-full'>
        {label && (
          <InputLabel inputId={controlId} label={label} required={required} />
        )}
        {as === 'textarea' ? (
          <textarea
            {...(baseProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            {...(baseProps as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {error ? (
          <TextInputFeedback inputId={inputId} message={error} type='error' />
        ) : hint ? (
          <TextInputFeedback inputId={inputId} message={hint} type='hint' />
        ) : null}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
export default TextInput;
