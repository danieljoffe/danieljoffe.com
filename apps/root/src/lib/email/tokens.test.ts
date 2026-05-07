/**
 * @jest-environment node
 */
import {
  signLeadId,
  verifyLeadToken,
  buildUnsubscribeUrl,
  signProfileToken,
  verifyProfileToken,
  buildProfileUnsubscribeUrl,
} from './tokens';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';
const PROFILE_ID = '11111111-2222-3333-4444-555555555555';

describe('email tokens', () => {
  beforeEach(() => {
    process.env['UNSUBSCRIBE_SECRET'] = 'test-secret';
  });

  describe('signLeadId', () => {
    it('produces a deterministic hex string', () => {
      const a = signLeadId(LEAD_ID);
      const b = signLeadId(LEAD_ID);
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces different signatures for different IDs', () => {
      const a = signLeadId(LEAD_ID);
      const b = signLeadId('00000000-0000-0000-0000-000000000001');
      expect(a).not.toBe(b);
    });
  });

  describe('verifyLeadToken', () => {
    it('returns true for a valid token', () => {
      const token = signLeadId(LEAD_ID);
      expect(verifyLeadToken(LEAD_ID, token)).toBe(true);
    });

    it('returns false for a tampered token', () => {
      const token = signLeadId(LEAD_ID);
      const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
      expect(verifyLeadToken(LEAD_ID, tampered)).toBe(false);
    });

    it('returns false for wrong lead ID', () => {
      const token = signLeadId(LEAD_ID);
      expect(
        verifyLeadToken('00000000-0000-0000-0000-000000000001', token)
      ).toBe(false);
    });

    it('returns false for wrong-length token', () => {
      expect(verifyLeadToken(LEAD_ID, 'short')).toBe(false);
    });
  });

  describe('buildUnsubscribeUrl', () => {
    it('returns a URL with lead_id and token params', () => {
      const url = buildUnsubscribeUrl(LEAD_ID, 'https://danieljoffe.com');
      expect(url).toContain('/api/email/unsubscribe?lead_id=');
      expect(url).toContain(`lead_id=${LEAD_ID}`);
      expect(url).toContain('&token=');
      expect(url.startsWith('https://danieljoffe.com')).toBe(true);
    });
  });

  describe('signProfileToken', () => {
    it('produces a deterministic hex string scoped by category', () => {
      const a = signProfileToken(PROFILE_ID, 'job_alerts');
      const b = signProfileToken(PROFILE_ID, 'job_alerts');
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it('does not collide with the leads namespace for the same id', () => {
      const lead = signLeadId(PROFILE_ID);
      const profile = signProfileToken(PROFILE_ID, 'job_alerts');
      expect(lead).not.toBe(profile);
    });
  });

  describe('verifyProfileToken', () => {
    it('returns true for a valid (id, category, token) triple', () => {
      const token = signProfileToken(PROFILE_ID, 'job_alerts');
      expect(verifyProfileToken(PROFILE_ID, 'job_alerts', token)).toBe(true);
    });

    it('returns false when category is wrong (tamper-proof category)', () => {
      const token = signProfileToken(PROFILE_ID, 'job_alerts');
      // Cast bypasses the type check — simulating a tampered URL parameter.
      expect(
        verifyProfileToken(PROFILE_ID, 'other_category' as 'job_alerts', token)
      ).toBe(false);
    });

    it('returns false for a tampered token', () => {
      const token = signProfileToken(PROFILE_ID, 'job_alerts');
      const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
      expect(verifyProfileToken(PROFILE_ID, 'job_alerts', tampered)).toBe(
        false
      );
    });

    it('returns false for a leads token reused on a profile', () => {
      const leadToken = signLeadId(PROFILE_ID);
      expect(verifyProfileToken(PROFILE_ID, 'job_alerts', leadToken)).toBe(
        false
      );
    });
  });

  describe('buildProfileUnsubscribeUrl', () => {
    it('returns a generic /profile/unsubscribe URL with profile_id, category, token', () => {
      const url = buildProfileUnsubscribeUrl(
        PROFILE_ID,
        'job_alerts',
        'https://danieljoffe.com'
      );
      expect(url).toContain('/api/email/profile/unsubscribe?profile_id=');
      expect(url).toContain(`profile_id=${PROFILE_ID}`);
      expect(url).toContain('&category=job_alerts');
      expect(url).toContain('&token=');
      expect(url.startsWith('https://danieljoffe.com')).toBe(true);
    });
  });
});
