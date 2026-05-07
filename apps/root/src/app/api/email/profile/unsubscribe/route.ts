import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  verifyProfileToken,
  type ProfileEmailCategory,
} from '@/lib/email/tokens';
import { captureApiError } from '@/lib/errorTracking';

const VALID_CATEGORIES: readonly ProfileEmailCategory[] = ['job_alerts'];

function isValidCategory(value: string | null): value is ProfileEmailCategory {
  return (
    value !== null && VALID_CATEGORIES.includes(value as ProfileEmailCategory)
  );
}

interface ParsedRequest {
  profileId: string;
  category: ProfileEmailCategory;
  token: string;
}

function parseAndVerify(request: NextRequest): ParsedRequest | NextResponse {
  const profileId = request.nextUrl.searchParams.get('profile_id');
  const category = request.nextUrl.searchParams.get('category');
  const token = request.nextUrl.searchParams.get('token');

  if (!profileId || !token || !category || !isValidUuid(profileId)) {
    return htmlResponse('Invalid unsubscribe link.', 400);
  }
  if (!isValidCategory(category)) {
    return htmlResponse('Invalid unsubscribe link.', 400);
  }
  if (!verifyProfileToken(profileId, category, token)) {
    return htmlResponse('Invalid unsubscribe link.', 403);
  }
  return { profileId, category, token };
}

/**
 * Updates user_profiles to disable the given category. Returns null on
 * success, or an HTML NextResponse on error.
 */
async function applyUnsubscribe(
  profileId: string,
  category: ProfileEmailCategory,
  method: 'GET' | 'POST'
): Promise<NextResponse | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return method === 'POST'
      ? new NextResponse(null, { status: 503 })
      : htmlResponse('Service temporarily unavailable. Please try again.', 503);
  }

  const update = unsubscribeUpdateFor(category);
  const { error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('id', profileId);

  if (error) {
    captureApiError(
      new Error(error.message),
      '/api/email/profile/unsubscribe',
      method,
      500,
      { profileId, category }
    );
    return method === 'POST'
      ? new NextResponse(null, { status: 500 })
      : htmlResponse('Something went wrong. Please try again.', 500);
  }

  return null;
}

function unsubscribeUpdateFor(
  category: ProfileEmailCategory
): Record<string, unknown> {
  switch (category) {
    case 'job_alerts':
      return {
        job_notifications_enabled: false,
        unsubscribed_at: new Date().toISOString(),
      };
  }
}

// Browser click — renders a confirmation page.
export async function GET(request: NextRequest) {
  const parsed = parseAndVerify(request);
  if (parsed instanceof NextResponse) return parsed;

  const err = await applyUnsubscribe(parsed.profileId, parsed.category, 'GET');
  if (err) return err;

  return htmlResponse(
    'You have been unsubscribed from Fitted job alerts.',
    200
  );
}

// RFC 8058 one-click unsubscribe (Gmail/Yahoo POST without user interaction).
export async function POST(request: NextRequest) {
  const parsed = parseAndVerify(request);
  if (parsed instanceof NextResponse) {
    // Mailbox providers expect 2xx for "unsubscribed"; surface real errors.
    return new NextResponse(null, { status: parsed.status });
  }

  const err = await applyUnsubscribe(parsed.profileId, parsed.category, 'POST');
  if (err) return err;

  return new NextResponse(null, { status: 200 });
}

function htmlResponse(message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — Daniel Joffe</title>
<style>
  body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .box { text-align: center; max-width: 400px; padding: 40px 20px; }
  h1 { font-size: 18px; color: #63CAA5; margin: 0 0 16px; }
  p { font-size: 15px; line-height: 1.6; color: #999; margin: 0 0 24px; }
  a { color: #63CAA5; text-decoration: underline; font-size: 14px; }
</style>
</head>
<body>
<div class="box">
  <h1>Daniel Joffe</h1>
  <p>${message}</p>
  <a href="https://danieljoffe.com">Return to danieljoffe.com</a>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
