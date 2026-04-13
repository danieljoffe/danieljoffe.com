import robots from '../robots';

jest.mock('@/utils/constants', () => ({
  DOMAIN_URL: 'https://danieljoffe.com',
}));

describe('robots', () => {
  it('returns a valid robots.txt configuration', () => {
    const result = robots();

    expect(result.rules).toBeDefined();
    expect(result.sitemap).toBe('https://danieljoffe.com/sitemap.xml');
  });

  it('allows all user agents to crawl /', () => {
    const result = robots();

    expect(result.rules).toEqual(
      expect.objectContaining({
        userAgent: '*',
        allow: '/',
      })
    );
  });

  it('disallows /thank-you/ and /api/', () => {
    const result = robots();

    expect(result.rules).toEqual(
      expect.objectContaining({
        disallow: ['/thank-you/', '/api/'],
      })
    );
  });
});
