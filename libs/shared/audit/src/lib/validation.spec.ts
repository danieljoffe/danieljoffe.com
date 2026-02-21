import { normalizeUrl, isValidUrl, hashIp } from './validation.js';

describe('normalizeUrl', () => {
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
