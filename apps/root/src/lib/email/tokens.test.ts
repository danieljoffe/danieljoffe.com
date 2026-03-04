/**
 * @jest-environment node
 */
import { signLeadId, verifyLeadToken, buildUnsubscribeUrl } from './tokens';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';

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
      expect(url).toStartWith('https://danieljoffe.com');
    });
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toStartWith(prefix: string): R;
    }
  }
}

expect.extend({
  toStartWith(received: string, prefix: string) {
    const pass = received.startsWith(prefix);
    return {
      pass,
      message: () =>
        `expected "${received}" ${pass ? 'not ' : ''}to start with "${prefix}"`,
    };
  },
});
