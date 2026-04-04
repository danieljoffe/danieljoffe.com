import { NextRequest, NextResponse } from 'next/server';
import { checkBotId } from 'botid/server';
import { ABOUT_LINK } from '@/utils/constants';
import { captureApiError } from '@/lib/errorTracking';
import { ErrorResponse, formSchema, SuccessResponse } from './schema';
import {
  requestFromSource,
  sendEmail,
  validateFormData,
  rateLimit,
} from './helpers';

/**
 * Contact Form API Endpoint
 *
 * Handles contact form submissions with comprehensive validation, rate limiting,
 * and email delivery via Resend.
 *
 * @param request - The incoming HTTP request containing form data
 * @returns Promise resolving to NextResponse with success or error data
 *
 * @throws {ErrorResponse} When validation fails, rate limit exceeded, or service errors occur
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ErrorResponse | SuccessResponse>> {
  const data = await request.json();

  try {
    if (process.env['VERCEL']) {
      const botCheck = await checkBotId();
      if (botCheck.isBot) {
        const botError: ErrorResponse = {
          error: { path: 'root.forbidden', message: 'Access denied' },
          statusCode: 403,
        };
        return NextResponse.json(botError, { status: 403 });
      }
    }

    await rateLimit(request);
    await requestFromSource(request, ABOUT_LINK.href);
    await validateFormData(data, formSchema);
    await sendEmail(data);

    const successResponse: SuccessResponse = {
      statusCode: 200,
      success: true,
      message: 'Email sent successfully',
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (e: unknown) {
    const error = e as ErrorResponse;

    captureApiError(
      e instanceof Error
        ? e
        : new Error(error.error?.message || 'Unknown API error'),
      '/api/email/contact',
      'POST',
      error.statusCode,
      {
        errorPath: error.error?.path,
        errorMessage: error.error?.message,
      }
    );

    const headers: HeadersInit = {};
    if (error.statusCode === 429 && error.retryAfter) {
      headers['Retry-After'] = String(error.retryAfter);
    }

    return NextResponse.json(error, {
      status: error.statusCode,
      headers,
    });
  }
}
