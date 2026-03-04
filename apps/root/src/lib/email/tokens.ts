import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret(): string {
  return (
    process.env['UNSUBSCRIBE_SECRET'] ||
    process.env['IP_HASH_SALT'] ||
    'audit-tool-fallback'
  );
}

/** Creates an HMAC-SHA256 signature for a lead ID. */
export function signLeadId(leadId: string): string {
  return createHmac('sha256', getSecret()).update(leadId).digest('hex');
}

/** Verifies a token matches the expected HMAC for the given lead ID. */
export function verifyLeadToken(leadId: string, token: string): boolean {
  const expected = signLeadId(leadId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Builds an unsubscribe URL with a signed token. */
export function buildUnsubscribeUrl(leadId: string, siteUrl: string): string {
  const token = signLeadId(leadId);
  return `${siteUrl}/api/email/unsubscribe?lead_id=${leadId}&token=${token}`;
}
