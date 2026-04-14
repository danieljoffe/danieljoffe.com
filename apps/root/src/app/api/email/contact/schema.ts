import { z } from 'zod/v4';
import { FORM_LIMITS, VALIDATION_PATTERNS } from '@/utils/constants';

/**
 * Contact Form API Schema and Type Definitions
 *
 * This module defines all TypeScript types and Zod validation schemas
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

/** Raw form data from the client, including the honeypot field */
export type RawFormData = FormFieldSchema & { address?: string | undefined };

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
  statusCode: 400 | 403 | 429 | 500;
  /** Seconds until the client should retry (set on 429 responses) */
  retryAfter?: number;
};

/** Success response from the contact form API */
export type SuccessResponse = {
  statusCode: 200;
  success: true;
  message: string;
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
 * Zod validation schema for contact form data
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
 * const validData = formSchema.parse({
 *   name: "John Doe",
 *   email: "john@example.com",
 *   message: "Hello, I'd like to get in touch about...",
 *   hcaptcha: "hcaptcha_token_here"
 * });
 * ```
 */
export const formSchema = z.object({
  /** Full name field with character validation */
  name: z
    .string()
    .transform(value => value.trim())
    .pipe(
      z
        .string()
        .regex(VALIDATION_PATTERNS.NAME, 'Name contains invalid characters')
        .min(NAME_MIN_LENGTH, minLengthMessage('Name', NAME_MIN_LENGTH))
        .max(NAME_MAX_LENGTH, maxLengthMessage('Name', NAME_MAX_LENGTH))
    ),
  /** Email address with format and deliverability validation */
  email: z
    .string()
    .transform(value => value.trim())
    .pipe(
      z
        .string()
        .email('Invalid email address')
        .min(EMAIL_MIN_LENGTH, minLengthMessage('Email', EMAIL_MIN_LENGTH))
        .max(EMAIL_MAX_LENGTH, maxLengthMessage('Email', EMAIL_MAX_LENGTH))
    ),
  /** Message content with anti-spam URL detection */
  message: z
    .string()
    .transform(value => value.trim())
    .pipe(
      z
        .string()
        .min(
          MESSAGE_MIN_LENGTH,
          minLengthMessage('Message', MESSAGE_MIN_LENGTH)
        )
        .max(
          MESSAGE_MAX_LENGTH,
          maxLengthMessage('Message', MESSAGE_MAX_LENGTH)
        )
        .refine(
          val => !/https?:\/\//i.test(val),
          'Please remove links from your message'
        )
    ),
  /** hCaptcha token for bot protection */
  hcaptcha: z.string().min(1, 'Please verify you are human'),
});
