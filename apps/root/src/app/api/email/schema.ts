import * as yup from 'yup';
import { FORM_LIMITS, VALIDATION_PATTERNS } from '@/utils/constants';

/**
 * Contact Form API Schema and Type Definitions
 *
 * This module defines all TypeScript types and Yup validation schemas
 * used by the contact form API endpoint.
 */

/** Valid form field names */
type FormField = 'name' | 'email' | 'message' | 'hcaptcha';

/** Root-level error types for system/service errors */
type RootError =
  | 'root.configurationError'
  | 'root.serviceError'
  | 'root.serverError'
  | 'root.unknownError'
  | 'root.forbidden';

/** Union type for all possible error sources */
type ErrorSource = FormField | RootError;

/** Form field error structure for client-side error handling */
export type FormFieldError = Record<ErrorSource, { message: string }>;

/** Contact form data structure */
export type FormFieldSchema<T = string> = Record<FormField, T>;

/**
 * Standardized error response format
 *
 * All API errors follow this consistent structure for easy client handling.
 */
export type ErrorResponse = {
  error: {
    /** Error location/field identifier */
    path: ErrorSource;
    /** Human-readable error message */
    message: string;
  };
  /** HTTP status code */
  statusCode: 200 | 400 | 500 | 403;
};

/**
 * ValidKit email validation service error response format
 *
 * Used when email validation fails via the ValidKit API.
 */
export type ValidKitErrorResponse = {
  error: {
    message: string;
    code: string;
    statusCode: 400;
  };
};

/**
 * Web3Forms service response format
 *
 * Standard response structure from the Web3Forms email service.
 */
export type WebFormsResponse<T = FormFieldSchema> = {
  statusCode: 200 | 400 | 500;
  success: boolean;
  body: {
    data: T;
    message: string;
  };
};

/** Validation length constraints */
export const NAME_MIN_LENGTH = 5;
export const NAME_MAX_LENGTH = FORM_LIMITS.NAME_MAX_LENGTH;
export const EMAIL_MIN_LENGTH = 3;
export const EMAIL_MAX_LENGTH = FORM_LIMITS.EMAIL_MAX_LENGTH;
export const MESSAGE_MIN_LENGTH = 30;
export const MESSAGE_MAX_LENGTH = FORM_LIMITS.MESSAGE_MAX_LENGTH;

/** Helper functions for generating consistent validation messages */
export const minLengthMessage = (label: string, min: number) =>
  `${label} must be at least ${min} characters`;
export const maxLengthMessage = (label: string, max: number) =>
  `${label} must be at most ${max} characters`;

/**
 * Yup validation schema for contact form data
 *
 * Comprehensive validation including:
 * - Input sanitization (trim whitespace)
 * - Length constraints
 * - Format validation (email, name patterns)
 * - Anti-spam protection (no URLs in message)
 * - CAPTCHA verification requirement
 *
 * @example
 * ```typescript
 * const validData = await formSchema.validate({
 *   name: "John Doe",
 *   email: "john@example.com",
 *   message: "Hello, I'd like to get in touch about...",
 *   hcaptcha: "hcaptcha_token_here"
 * });
 * ```
 */
export const formSchema = yup
  .object()
  .shape({
    /** Full name field with character validation */
    name: yup
      .string()
      .transform(value => (value ? value.trim() : value))
      .matches(VALIDATION_PATTERNS.NAME, 'Name contains invalid characters')
      .min(NAME_MIN_LENGTH, minLengthMessage('Name', NAME_MIN_LENGTH))
      .max(NAME_MAX_LENGTH, maxLengthMessage('Name', NAME_MAX_LENGTH))
      .required('Name is required'),
    /** Email address with format and deliverability validation */
    email: yup
      .string()
      .transform(value => (value ? value.trim() : value))
      .email('Invalid email address')
      .min(EMAIL_MIN_LENGTH, minLengthMessage('Email', EMAIL_MIN_LENGTH))
      .max(EMAIL_MAX_LENGTH, maxLengthMessage('Email', EMAIL_MAX_LENGTH))
      .required('Email is required'),
    /** Message content with anti-spam URL detection */
    message: yup
      .string()
      .transform(value => (value ? value.trim() : value))
      .test('no-urls', 'Please remove links from your message', val =>
        val ? !/https?:\/\//i.test(val) : true
      )
      .min(MESSAGE_MIN_LENGTH, minLengthMessage('Message', MESSAGE_MIN_LENGTH))
      .max(MESSAGE_MAX_LENGTH, maxLengthMessage('Message', MESSAGE_MAX_LENGTH))
      .required('Message is required'),
    /** hCaptcha token for bot protection */
    hcaptcha: yup.string().required('Please verify you are human'),
  })
  .label('Contact Form')
  .required();
