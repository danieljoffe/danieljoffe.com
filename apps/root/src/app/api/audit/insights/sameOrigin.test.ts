/**
 * @jest-environment node
 */
import { isSameOrigin } from './sameOrigin';

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/audit/insights/summary', {
    headers,
  });
}

describe('isSameOrigin', () => {
  it('accepts danieljoffe.com origin', () => {
    expect(isSameOrigin(req({ origin: 'https://danieljoffe.com' }))).toBe(true);
  });

  it('accepts www.danieljoffe.com origin', () => {
    expect(isSameOrigin(req({ origin: 'https://www.danieljoffe.com' }))).toBe(
      true
    );
  });

  it('accepts localhost dev origin', () => {
    expect(isSameOrigin(req({ origin: 'http://localhost:3000' }))).toBe(true);
  });

  it('accepts vercel preview origins', () => {
    expect(
      isSameOrigin(req({ origin: 'https://my-pr-preview.vercel.app' }))
    ).toBe(true);
  });

  it('falls back to referer when origin is missing', () => {
    expect(
      isSameOrigin(req({ referer: 'https://danieljoffe.com/audit/insights' }))
    ).toBe(true);
  });

  it('rejects external origins', () => {
    expect(isSameOrigin(req({ origin: 'https://evil.example.com' }))).toBe(
      false
    );
  });

  it('rejects when neither header is set', () => {
    expect(isSameOrigin(req({}))).toBe(false);
  });

  it('rejects malformed origin values', () => {
    expect(isSameOrigin(req({ origin: 'not a url' }))).toBe(false);
  });
});
