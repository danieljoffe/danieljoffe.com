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

// Fitted (user_profiles) tokens use a distinct HMAC namespace so a lead-
// unsubscribe token can't be replayed against a profile and vice versa.
const PROFILE_NAMESPACE = 'profile:';

export function signProfileId(profileId: string): string {
  return createHmac('sha256', getSecret())
    .update(`${PROFILE_NAMESPACE}${profileId}`)
    .digest('hex');
}

export function verifyProfileToken(profileId: string, token: string): boolean {
  const expected = signProfileId(profileId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function buildProfileUnsubscribeUrl(
  profileId: string,
  siteUrl: string
): string {
  const token = signProfileId(profileId);
  return `${siteUrl}/api/email/jobs/unsubscribe?profile_id=${profileId}&token=${token}`;
}
