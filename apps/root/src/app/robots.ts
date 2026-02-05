import { MetadataRoute } from 'next';
import { DOMAIN_URL } from '@/utils/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/thank-you/', '/api/'],
    },
    sitemap: `${DOMAIN_URL}/sitemap.xml`,
  };
}
