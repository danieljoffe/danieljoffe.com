import * as yup from 'yup';
import { ValidationError } from 'yup';
import { NextRequest } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';
import ContactNotification from '@/components/emails/ContactNotification';
import { createResendClient, EMAIL_FROM, EMAIL_TO } from '@/lib/email/resend';
import { FORM_LIMITS } from '@/utils/constants';
import { devLog } from '@/utils/helpers';
import { ErrorResponse, FormFieldSchema, RawFormData } from './schema';

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
  data: RawFormData,
  schema: yup.ObjectSchema<T>
): Promise<ErrorResponse | null> => {
  // Honeypot check — outside try/catch so the 403 status code is not
  // overwritten by the generic validation error handler below.
  if (data?.address && data.address.length > 0) {
    throw {
      error: {
        path: 'root.forbidden',
        message: 'Forbidden',
      },
      statusCode: 403,
    } as ErrorResponse;
  }

  try {
    // Sanitize inputs
    const sanitized: RawFormData = {
      name: DOMPurify.sanitize(data.name),
      email: DOMPurify.sanitize(data.email),
      message: DOMPurify.sanitize(data.message),
      hcaptcha: data.hcaptcha,
      address: data.address,
    };

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
      statusCode: 400,
    } as ErrorResponse;
  }
};

/**
 * Sends contact form notification email via Resend
 *
 * Delivers a notification to the site owner with the sender's details
 * and message. Uses reply-to so responding goes directly to the sender.
 *
 * @param data - Validated form data containing name, email, and message
 * @returns Promise that resolves to null on success
 * @throws {ErrorResponse} When email service is unavailable or fails
 */
export const sendEmail = async (
  data: FormFieldSchema
): Promise<ErrorResponse | null> => {
  const resend = createResendClient();
  if (!resend) {
    devLog('RESEND_API_KEY is not configured. Cannot send email.');
    throw {
      error: {
        path: 'root.configurationError',
        message: `Sorry, we're experiencing technical difficulties. Please try again later.`,
      },
      statusCode: 500,
    } as ErrorResponse;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      replyTo: data.email,
      subject: `New message from ${data.name}`,
      react: ContactNotification({
        name: data.name,
        email: data.email,
        message: data.message,
      }),
    });

    if (error) {
      devLog('Resend error', error);
      throw {
        error: {
          path: 'root.serviceError',
          message: 'Failed to send email. Please try again later.',
        },
        statusCode: 500,
      } as ErrorResponse;
    }

    return null;
  } catch (e: unknown) {
    devLog('sendEmail error', e);
    if ((e as ErrorResponse).statusCode) throw e;
    throw {
      error: {
        path: 'root.serviceError',
        message: 'Failed to send email. Please try again later.',
      },
      statusCode: 500,
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
 * Returns proper HTTP 429 status with Retry-After information when exceeded.
 *
 * Rate limits:
 * - Maximum requests per IP: Configured in FORM_LIMITS.RATE_LIMIT_REQUESTS
 * - Time window: Configured in FORM_LIMITS.RATE_LIMIT_WINDOW_MS
 *
 * @param req - The incoming Next.js request object
 * @returns Promise that resolves to null if within rate limits
 * @throws {ErrorResponse} 429 when rate limit exceeded, 403 when IP missing
 *
 * @example
 * ```typescript
 * await rateLimit(request);
 * // Throws 429 error if too many requests from same IP
 * ```
 */
export const rateLimit = async (
  req: NextRequest
): Promise<ErrorResponse | null> => {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip');

  if (!ip) {
    throw {
      error: {
        path: 'root.forbidden',
        message: 'Forbidden',
      },
      statusCode: 403,
    } as ErrorResponse;
  }

  const entry = incrementRateLimit(ip);

  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.ceil((entry.reset - Date.now()) / 1000);
    throw {
      error: {
        path: 'root.forbidden',
        message: 'Too many requests. Please try again later.',
      },
      statusCode: 429,
      retryAfter: retryAfterSeconds,
    } as ErrorResponse;
  }

  return null;
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
type RateLimitEntry = { count: number; reset: number };

const globalStore = globalThis as typeof globalThis & {
  __apiRateLimitStore?: Map<string, RateLimitEntry>;
  __apiRateLimitLastCleanup?: number;
};

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const incrementRateLimit = (ip: string) => {
  const now = Date.now();

  if (!globalStore.__apiRateLimitStore) {
    globalStore.__apiRateLimitStore = new Map();
  }

  const store = globalStore.__apiRateLimitStore;

  // Periodically purge expired entries to prevent unbounded growth
  if (
    !globalStore.__apiRateLimitLastCleanup ||
    now - globalStore.__apiRateLimitLastCleanup > CLEANUP_INTERVAL_MS
  ) {
    for (const [key, val] of store) {
      if (val.reset < now) store.delete(key);
    }
    globalStore.__apiRateLimitLastCleanup = now;
  }

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
