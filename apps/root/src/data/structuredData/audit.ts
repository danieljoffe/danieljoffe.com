import { DOMAIN_URL } from '@/utils/constants';

export const auditFaqStructuredData = Object.freeze({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What does this audit check?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The audit analyzes your website across four categories: performance (load speed, Core Web Vitals), accessibility (WCAG compliance), SEO (search engine optimization), and best practices (security, modern APIs). It uses Google Lighthouse and axe-core under the hood.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is this really free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, the audit is completely free with no signup required. You get an overall grade, category scores, and your top 3 issues immediately. Enter your email to unlock the full report with all issues and prioritized recommendations.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long does the audit take?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most audits complete in under 30 seconds. The scan runs a headless Chrome browser against your site to gather real performance data, accessibility violations, and SEO issues.',
      },
    },
  ],
  url: `${DOMAIN_URL}/audit`,
});
