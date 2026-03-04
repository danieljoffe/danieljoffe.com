/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockRateLimit = jest.fn();
const mockRequestFromSource = jest.fn();
const mockValidateFormData = jest.fn();
const mockSendEmail = jest.fn();

jest.mock('./helpers', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  requestFromSource: (...args: unknown[]) => mockRequestFromSource(...args),
  validateFormData: (...args: unknown[]) => mockValidateFormData(...args),
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

jest.mock('./schema', () => ({
  formSchema: {},
}));

jest.mock('@/utils/constants', () => ({
  ABOUT_LINK: { href: '/about' },
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

import { POST } from './route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://danieljoffe.com/api/email/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  message: 'Hello, this is a test message with enough characters.',
  hcaptcha: 'test-token',
};

describe('POST /api/email/contact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimit.mockResolvedValue(null);
    mockRequestFromSource.mockResolvedValue(null);
    mockValidateFormData.mockResolvedValue(null);
    mockSendEmail.mockResolvedValue(null);
  });

  it('returns 200 with success response on happy path', async () => {
    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      statusCode: 200,
      success: true,
      message: 'Email sent successfully',
    });
  });

  it('calls helpers in sequence with correct args', async () => {
    const req = makeRequest(validBody);
    await POST(req);

    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRequestFromSource).toHaveBeenCalledWith(
      expect.any(NextRequest),
      '/about'
    );
    expect(mockValidateFormData).toHaveBeenCalledWith(validBody, {});
    expect(mockSendEmail).toHaveBeenCalledWith(validBody);
  });

  it('returns error response when rateLimit throws', async () => {
    mockRateLimit.mockRejectedValue({
      error: { path: 'root.forbidden', message: 'Too many requests' },
      statusCode: 429,
      retryAfter: 30,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.statusCode).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('returns 403 when requestFromSource throws', async () => {
    mockRequestFromSource.mockRejectedValue({
      error: { path: 'root.forbidden', message: 'Forbidden' },
      statusCode: 403,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('returns 400 when validateFormData throws', async () => {
    mockValidateFormData.mockRejectedValue({
      error: { path: 'name', message: 'Name is required' },
      statusCode: 400,
    });

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.path).toBe('name');
  });

  it('returns 500 when sendEmail throws', async () => {
    mockSendEmail.mockRejectedValue({
      error: {
        path: 'root.serviceError',
        message: 'Failed to send email',
      },
      statusCode: 500,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('does not set Retry-After header for non-429 errors', async () => {
    mockRequestFromSource.mockRejectedValue({
      error: { path: 'root.forbidden', message: 'Forbidden' },
      statusCode: 403,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.headers.get('Retry-After')).toBeNull();
  });

  it('reports errors to Sentry', async () => {
    const { captureApiError } = jest.requireMock('@/lib/errorTracking');

    mockSendEmail.mockRejectedValue({
      error: {
        path: 'root.serviceError',
        message: 'Failed to send email',
      },
      statusCode: 500,
    });

    await POST(makeRequest(validBody));

    expect(captureApiError).toHaveBeenCalledWith(
      expect.any(Error),
      '/api/email/contact',
      'POST',
      500,
      expect.objectContaining({
        errorPath: 'root.serviceError',
        errorMessage: 'Failed to send email',
      })
    );
  });
});
