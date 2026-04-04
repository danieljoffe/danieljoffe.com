import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyLeadToken } from '@/lib/email/tokens';
import { captureApiError } from '@/lib/errorTracking';

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('lead_id');
  const token = request.nextUrl.searchParams.get('token');

  if (!leadId || !token || !isValidUuid(leadId)) {
    return htmlResponse('Invalid unsubscribe link.', 400);
  }

  if (!verifyLeadToken(leadId, token)) {
    return htmlResponse('Invalid unsubscribe link.', 403);
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return htmlResponse(
      'Service temporarily unavailable. Please try again.',
      503
    );
  }

  const { error } = await supabase
    .from('leads')
    .update({
      unsubscribed: true,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (error) {
    captureApiError(
      new Error(error.message),
      '/api/email/unsubscribe',
      'GET',
      500,
      { leadId }
    );
    return htmlResponse('Something went wrong. Please try again.', 500);
  }

  return htmlResponse(
    'You have been unsubscribed. You will no longer receive emails from the audit tool.',
    200
  );
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
