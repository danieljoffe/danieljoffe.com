/**
 * Map raw scan-service error messages to user-friendly text.
 * The raw messages are still stored in the database for debugging.
 */
export function friendlyErrorMessage(raw: string | null): string {
  if (!raw) return 'Something went wrong. Please try again.';

  if (raw.includes('WS endpoint URL'))
    return "Our scanner couldn't start. The site may be blocking automated browsers. Please try again.";

  if (/timed?\s*out/i.test(raw))
    return 'This site took too long to load. Please try again.';

  if (raw.includes('Failed to reach scan service'))
    return 'Our scanning service is temporarily unavailable. Please try again in a few minutes.';

  return 'Something went wrong. Please try again.';
}
