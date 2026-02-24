import { Resend } from 'resend';

/** Creates a Resend client from env. Returns null if API key is missing. */
export function createResendClient(): Resend | null {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export const EMAIL_FROM = 'Daniel Joffe <noreply@danieljoffe.com>';
