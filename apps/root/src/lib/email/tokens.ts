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

// ---------------------------------------------------------------------------
// Profile (Fitted user_profiles) tokens
//
// Distinct HMAC namespace ('profile:{category}:{id}') so a token can't be
// replayed across (a) lead unsubscribe vs. profile, or (b) different profile
// notification categories. Category is part of the HMAC payload, so flipping
// `?category=` in the URL invalidates the signature.
// ---------------------------------------------------------------------------

export type ProfileEmailCategory = 'job_alerts';

const PROFILE_NAMESPACE = 'profile';

export function signProfileToken(
  profileId: string,
  category: ProfileEmailCategory
): string {
  return createHmac('sha256', getSecret())
    .update(`${PROFILE_NAMESPACE}:${category}:${profileId}`)
    .digest('hex');
}

export function verifyProfileToken(
  profileId: string,
  category: ProfileEmailCategory,
  token: string
): boolean {
  const expected = signProfileToken(profileId, category);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function buildProfileUnsubscribeUrl(
  profileId: string,
  category: ProfileEmailCategory,
  siteUrl: string
): string {
  const token = signProfileToken(profileId, category);
  return `${siteUrl}/api/email/profile/unsubscribe?profile_id=${profileId}&category=${category}&token=${token}`;
}
