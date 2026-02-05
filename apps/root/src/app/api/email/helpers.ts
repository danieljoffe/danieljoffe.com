import {
  ErrorResponse,
  FormFieldSchema,
  ValidKitErrorResponse,
  WebFormsResponse,
} from './schema';
import * as yup from 'yup';
import { ValidationError } from 'yup';
import { serverEnv, RequiredEnvVars } from '@/lib/env';
import { NextRequest } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';
import { FORM_LIMITS } from '@/utils/constants';
import { devLog } from '@/utils/helpers';

// Simple in-memory store for rate limiting (per process)
const RATE_LIMIT_WINDOW_MS = FORM_LIMITS.RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_MAX = FORM_LIMITS.RATE_LIMIT_REQUESTS;

/**
 * Validates and sanitizes form data against the provided Yup schema
 *
 * Performs comprehensive validation including:
 * - Honeypot field detection (hidden address field)
 * - Input sanitization using DOMPurify
 * - Schema validation using Yup
 * - Anti-spam protection
 *
 * @template T - The Yup schema object type
 * @param data - Raw form data to validate
 * @param schema - Yup validation schema to apply
 * @returns Promise that resolves to null on success
 * @throws {ErrorResponse} When validation fails or spam is detected
 *
 * @example
 * ```typescript
 * const result = await validateFormData(formData, formSchema);
 * // Returns null on success, throws ErrorResponse on failure
 * ```
 */
export const validateFormData = async <T extends yup.AnyObject>(
  data: FormFieldSchema,
  schema: yup.ObjectSchema<T>
): Promise<ErrorResponse | null> => {
  try {
    // @ts-expect-error - address is a hidden field
    if (data?.address?.length > 0) {
      throw {
        error: {
          path: 'root.forbidden',
          message: 'Forbidden',
        },
        statusCode: 403,
      } as ErrorResponse;
    }

    // Sanitize inputs
    const sanitized: FormFieldSchema = {
      name: DOMPurify.sanitize(data.name),
      email: DOMPurify.sanitize(data.email),
      message: DOMPurify.sanitize(data.message),
      hcaptcha: data.hcaptcha,
      // @ts-expect-error - address is a hidden field
      address: data.address,
    } as unknown as FormFieldSchema;

    await schema.validate(sanitized, {
      stripUnknown: true,
    });
    return null;
  } catch (e: unknown) {
    const error = e as ValidationError;
    throw {
      error: {
        path: error.path ?? 'root.unknownError',
        message: error.message,
      },
      statusCode: 200,
    } as ErrorResponse;
  }
};

/**
 * Validates email address using ValidKit API service
 *
 * Performs real-time email validation to check:
 * - Email format validity
 * - Domain existence
 * - Mailbox deliverability
 * - Disposable email detection
 *
 * @param email - Email address to validate
 * @returns Promise that resolves to null on success
 * @throws {ErrorResponse} When email is invalid or service is unavailable
 *
 * @example
 * ```typescript
 * await validateEmail("user@example.com");
 * // Throws error if email is invalid or undeliverable
 * ```
 */
export const validateEmail = async (
  email: string
): Promise<ErrorResponse | null> => {
  if (!serverEnv.VALIDKIT_API_KEY) {
    throw {
      error: {
        path: 'root.configurationError',
        message: `Sorry, we're experiencing technical difficulties. Please try again later.`,
      },
      statusCode: 200,
    } as ErrorResponse;
  }

  try {
    const res = await fetch(serverEnv.VALIDKIT_API_URL ?? '', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': serverEnv.VALIDKIT_API_KEY ?? '',
      },
    });
    const response = await res.json();
    const { error } = response as ValidKitErrorResponse;

    if (error) {
      throw response;
    }
    return null;
  } catch (e: unknown) {
    const error = e as ValidKitErrorResponse;
    throw {
      error: {
        path: 'email',
        message: error.error.message,
      },
      statusCode: error.error.statusCode,
    } as ErrorResponse;
  }
};

/**
 * Sends contact form email using Web3Forms service
 *
 * Formats and sends the contact form data as an email notification.
 * Includes sender information, message content, and proper subject line.
 *
 * @param data - Validated form data containing name, email, and message
 * @returns Promise that resolves to null on success
 * @throws {ErrorResponse} When email service is unavailable or fails
 *
 * @example
 * ```typescript
 * const formData = {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   message: "Hello world",
 *   hcaptcha: "token"
 * };
 * await sendEmail(formData);
 * ```
 */
export const sendEmail = async (
  data: FormFieldSchema
): Promise<ErrorResponse | null> => {
  if (!serverEnv.WEB3FORMS_ACCESS_KEY) {
    devLog(`${RequiredEnvVars.WEB3FORMS_ACCESS_KEY} is not configured.`);
    throw {
      error: {
        path: 'root.configurationError',
        message: `Sorry, we're experiencing technical difficulties. Please try again later.`,
      },
      statusCode: 200,
    } as ErrorResponse;
  }

  try {
    await fetch(serverEnv.WEB3FORMS_API_URL ?? '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_name: data.name,
        from_email: data.email,
        message: data.message,
        subject: `📥 Web3Forms: New message from ${data.name}`,
        access_key: serverEnv.WEB3FORMS_ACCESS_KEY,
      }),
    });

    return null;
  } catch (e: unknown) {
    const error = e as WebFormsResponse;
    throw {
      error: {
        path: 'root.serviceError',
        message: error.body.message,
      },
      statusCode: error.statusCode,
    } as ErrorResponse;
  }
};

/**
 * Validates that the request originates from an allowed source page
 *
 * Security middleware that checks the HTTP referer header to ensure
 * the API is only called from legitimate pages (e.g., contact form page).
 * Prevents direct API access and cross-site request forgery.
 *
 * @param req - The incoming Next.js request object
 * @param source - Expected source path (e.g., "/about")
 * @returns Promise that resolves to null if source is valid
 * @throws {ErrorResponse} When request source is invalid or missing
 *
 * @example
 * ```typescript
 * await requestFromSource(request, "/about");
 * // Throws 403 error if not called from /about page
 * ```
 */
export const requestFromSource = async (
  req: NextRequest,
  source: string
): Promise<ErrorResponse | null> => {
  const errorResponse: ErrorResponse = {
    error: {
      path: 'root.forbidden',
      message: 'Forbidden',
    },
    statusCode: 403,
  };

  try {
    const referer = req.headers.get('referer');

    if (!referer) {
      throw errorResponse;
    }

    const url = new URL(referer);
    if (!url.pathname.includes(source)) {
      throw errorResponse;
    }

    return Promise.resolve(null);
  } catch (e: unknown) {
    const error = e as ErrorResponse;
    throw error;
  }
};

/**
 * Implements IP-based rate limiting for API requests
 *
 * Prevents abuse by limiting the number of requests per IP address
 * within a specified time window. Uses in-memory storage for tracking.
 *
 * Rate limits:
 * - Maximum requests per IP: Configured in FORM_LIMITS.RATE_LIMIT_REQUESTS
 * - Time window: Configured in FORM_LIMITS.RATE_LIMIT_WINDOW_MS
 *
 * @param req - The incoming Next.js request object
 * @returns Promise that resolves to null if within rate limits
 * @throws {ErrorResponse} When rate limit is exceeded
 *
 * @example
 * ```typescript
 * await rateLimit(request);
 * // Throws 403 error if too many requests from same IP
 * ```
 */
export const rateLimit = async (
  req: NextRequest
): Promise<ErrorResponse | null> => {
  const errorResponse: ErrorResponse = {
    error: {
      path: 'root.forbidden',
      message: 'Forbidden',
    },
    statusCode: 403,
  };

  try {
    const ip = req.headers.get('x-forwarded-for');
    if (!ip) {
      throw errorResponse;
    }

    const entry = incrementRateLimit(ip);

    if (entry.count > RATE_LIMIT_MAX) {
      throw errorResponse;
    }

    return Promise.resolve(null);
  } catch (e: unknown) {
    const error = e as ErrorResponse;
    throw error;
  }
};

/**
 * Internal helper function to increment rate limit counter for an IP address
 *
 * Manages the in-memory rate limiting store, creating new entries for IPs
 * and incrementing existing counters. Automatically resets counters after
 * the time window expires.
 *
 * @param ip - IP address to track
 * @returns Object with current count and reset timestamp
 *
 * @internal This function is not exported and only used by rateLimit()
 */
const incrementRateLimit = (ip: string) => {
  const now = Date.now();

  // @ts-expect-error - global is not defined in the browser
  if (!global.__apiRateLimitStore) {
    // @ts-expect-error - global is not defined in the browser
    global.__apiRateLimitStore = new Map();
  }

  // @ts-expect-error - server-only code
  const store = global.__apiRateLimitStore as Map<
    string,
    { count: number; reset: number }
  >;

  let entry = store.get(ip);
  if (!entry || entry.reset < now) {
    entry = { count: 1, reset: now + RATE_LIMIT_WINDOW_MS };
    store.set(ip, entry);
  } else {
    entry.count += 1;
    store.set(ip, entry);
  }

  return entry;
};
