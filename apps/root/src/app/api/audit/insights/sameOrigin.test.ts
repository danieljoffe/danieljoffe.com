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

  it('accepts the project-prefixed vercel production alias', () => {
    expect(
      isSameOrigin(req({ origin: 'https://danieljoffe-com.vercel.app' }))
    ).toBe(true);
  });

  it('accepts project-prefixed vercel preview origins', () => {
    expect(
      isSameOrigin(
        req({
          origin: 'https://danieljoffe-com-git-feature-x-team.vercel.app',
        })
      )
    ).toBe(true);
  });

  it('rejects unrelated *.vercel.app origins', () => {
    expect(isSameOrigin(req({ origin: 'https://attacker.vercel.app' }))).toBe(
      false
    );
    expect(
      isSameOrigin(req({ origin: 'https://danieljoffe-evil.vercel.app' }))
    ).toBe(false);
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
