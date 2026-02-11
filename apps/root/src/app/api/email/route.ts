import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponse, formSchema, WebFormsResponse } from './schema';
import {
  requestFromSource,
  sendEmail,
  validateEmail,
  validateFormData,
  rateLimit,
} from './helpers';
import { ABOUT_LINK } from '@/utils/constants';
import { captureApiError } from '@/lib/errorTracking';

/**
 * Contact Form API Endpoint
 *
 * Handles contact form submissions with comprehensive validation, rate limiting,
 * and email delivery. This endpoint processes form data from the contact page
 * and sends emails via Web3Forms service.
 *
 * @param request - The incoming HTTP request containing form data
 * @returns Promise resolving to NextResponse with success or error data
 *
 * @example
 * ```typescript
 * // Request body structure
 * {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   message: "Hello, I'd like to get in touch...",
 *   hcaptcha: "hcaptcha_token_here"
 * }
 *
 * // Success response
 * {
 *   statusCode: 200,
 *   success: true,
 *   body: {
 *     data: {},
 *     message: "Email sent successfully"
 *   }
 * }
 *
 * // Error response
 * {
 *   error: {
 *     path: "email",
 *     message: "Invalid email address"
 *   },
 *   statusCode: 200
 * }
 * ```
 *
 * @throws {ErrorResponse} When validation fails, rate limit exceeded, or service errors occur
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ErrorResponse | WebFormsResponse>> {
  const data = await request.json();

  try {
    await rateLimit(request);
    await requestFromSource(request, ABOUT_LINK.href);
    await validateFormData(data, formSchema);
    await validateEmail(data.email);
    await sendEmail(data);

    const successResponse = {
      statusCode: 200,
      success: true,
      body: {
        data: {},
        message: 'Email sent successfully',
      },
    } as WebFormsResponse;

    return NextResponse.json(successResponse, {
      status: successResponse.statusCode,
    });
  } catch (e: unknown) {
    const error = e as ErrorResponse;

    // Capture API errors in Sentry for monitoring
    captureApiError(
      e instanceof Error
        ? e
        : new Error(error.error?.message || 'Unknown API error'),
      '/api/email',
      'POST',
      error.statusCode,
      {
        errorPath: error.error?.path,
        errorMessage: error.error?.message,
      }
    );

    return NextResponse.json(error, { status: error.statusCode });
  }
}
