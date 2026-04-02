import { normalizeUrl, isValidUrl, hashIp, isValidUuid } from './validation.js';

describe('normalizeUrl', () => {
  // --- Existing behaviors ---
  it('adds https:// when no protocol is given', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('removes trailing slashes', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com///')).toBe('https://example.com');
  });

  it('removes www prefix', () => {
    expect(normalizeUrl('https://www.example.com')).toBe('https://example.com');
  });

  it('lowercases the URL', () => {
    expect(normalizeUrl('HTTPS://EXAMPLE.COM')).toBe('https://example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('handles www with no protocol', () => {
    expect(normalizeUrl('www.example.com')).toBe('https://example.com');
  });

  it('preserves paths', () => {
    expect(normalizeUrl('https://example.com/page')).toBe(
      'https://example.com/page'
    );
  });

  // --- New: query parameter ordering ---
  it('sorts query parameters alphabetically', () => {
    expect(normalizeUrl('https://example.com?b=2&a=1')).toBe(
      'https://example.com?a=1&b=2'
    );
  });

  it('preserves query parameters when already sorted', () => {
    expect(normalizeUrl('https://example.com?a=1&b=2')).toBe(
      'https://example.com?a=1&b=2'
    );
  });

  it('handles single query parameter', () => {
    expect(normalizeUrl('https://example.com?key=value')).toBe(
      'https://example.com?key=value'
    );
  });

  // --- New: fragment removal ---
  it('removes fragments', () => {
    expect(normalizeUrl('https://example.com#section')).toBe(
      'https://example.com'
    );
  });

  it('removes fragments with paths', () => {
    expect(normalizeUrl('https://example.com/page#top')).toBe(
      'https://example.com/page'
    );
  });

  it('removes fragments but keeps query params', () => {
    expect(normalizeUrl('https://example.com?a=1#section')).toBe(
      'https://example.com?a=1'
    );
  });

  // --- New: default port removal ---
  it('removes default port 443 for https', () => {
    expect(normalizeUrl('https://example.com:443')).toBe(
      'https://example.com'
    );
  });

  it('removes default port 80 for http', () => {
    expect(normalizeUrl('http://example.com:80')).toBe('http://example.com');
  });

  it('preserves non-default ports', () => {
    expect(normalizeUrl('https://example.com:8080')).toBe(
      'https://example.com:8080'
    );
  });

  // --- New: duplicate slash collapsing ---
  it('collapses duplicate slashes in path', () => {
    expect(normalizeUrl('https://example.com//page')).toBe(
      'https://example.com/page'
    );
  });

  it('collapses multiple duplicate slashes', () => {
    expect(normalizeUrl('https://example.com///a///b')).toBe(
      'https://example.com/a/b'
    );
  });

  // --- New: removes trailing slashes from paths ---
  it('removes trailing slash from paths', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe(
      'https://example.com/page'
    );
  });

  // --- Combined edge cases ---
  it('normalizes all permutations together', () => {
    const input = '  HTTPS://WWW.Example.COM:443//page///sub/?z=3&a=1#frag  ';
    expect(normalizeUrl(input)).toBe('https://example.com/page/sub?a=1&z=3');
  });

  it('normalizes equivalent URLs to the same canonical form', () => {
    const variants = [
      'https://www.example.com/page',
      'https://example.com/page/',
      'HTTPS://EXAMPLE.COM/page#section',
      'https://example.com:443/page',
      'https://www.example.com:443/page/',
      '  www.example.com/page  ',
    ];
    const normalized = variants.map(normalizeUrl);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('https://example.com/page');
  });
});

describe('isValidUrl', () => {
  it('accepts valid public URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://sub.example.com/path')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts URLs without protocol (adds https)', () => {
    expect(isValidUrl('example.com')).toBe(true);
  });

  it('rejects localhost', () => {
    expect(isValidUrl('http://localhost')).toBe(false);
    expect(isValidUrl('http://localhost:3000')).toBe(false);
  });

  it('rejects IPv4 loopback', () => {
    expect(isValidUrl('http://127.0.0.1')).toBe(false);
    expect(isValidUrl('http://127.0.0.1:8080')).toBe(false);
  });

  it('rejects IPv6 loopback', () => {
    expect(isValidUrl('http://[::1]')).toBe(false);
  });

  it('rejects private network ranges', () => {
    expect(isValidUrl('http://192.168.1.1')).toBe(false);
    expect(isValidUrl('http://10.0.0.1')).toBe(false);
    expect(isValidUrl('http://172.16.0.1')).toBe(false);
    expect(isValidUrl('http://172.31.255.255')).toBe(false);
  });

  it('rejects 0.0.0.0', () => {
    expect(isValidUrl('http://0.0.0.0')).toBe(false);
  });

  it('rejects link-local addresses', () => {
    expect(isValidUrl('http://169.254.1.1')).toBe(false);
  });

  it('rejects hostnames without a TLD', () => {
    expect(isValidUrl('http://intranet')).toBe(false);
  });

  it('rejects completely invalid input', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not a url at all')).toBe(false);
  });

  it('allows 172.x outside the private range', () => {
    // IPs with dots pass the TLD check, so these are valid public IPs
    expect(isValidUrl('http://172.15.0.1')).toBe(true);
    expect(isValidUrl('http://172.32.0.1')).toBe(true);
  });
});

describe('isValidUuid', () => {
  it('accepts valid UUIDs', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  it('accepts uppercase UUIDs', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rejects non-UUID strings', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('rejects UUIDs with invalid characters', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
  });
});

describe('hashIp', () => {
  it('returns a 16-character hex string', () => {
    const hash = hashIp('192.168.1.1');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns consistent output for the same input', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  it('returns different output for different IPs', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('5.6.7.8'));
  });
});
