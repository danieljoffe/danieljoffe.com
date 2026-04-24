import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

/**
 * Handles the magic link callback from Supabase Auth.
 *
 * When a user clicks the magic link in their email, Supabase redirects
 * to this route with a `code` query parameter. We exchange that code
 * for a session, then redirect to /fitted.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/fitted';

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code is missing or exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/fitted/login`);
}
