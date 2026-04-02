import { DOMAIN_URL, FULL_NAME, SERVICES_LINK } from '@/utils/constants';
import { personStructuredData } from './base';

const services = [
  {
    name: 'Performance Audits & Optimization',
    description:
      'Diagnose and fix performance issues—bloated bundles, unoptimized assets, layout shifts. Includes Lighthouse audit, implementation, and metrics report.',
    price: '5000.00',
    timeline: '2-4 weeks',
  },
  {
    name: 'Component Libraries & Design Systems',
    description:
      'Build shared component systems that scale. Includes component audit, documented Storybook library, and contribution guidelines.',
    price: '10000.00',
    timeline: '4-8 weeks',
  },
  {
    name: 'CMS & Self-Serve Tooling',
    description:
      'Build tooling that gives non-technical teams full autonomy. CMS architecture, composable page builders, and team training.',
    price: '8000.00',
    timeline: '3-6 weeks',
  },
  {
    name: 'MVP & Product Frontend Builds',
    description:
      'Architect and build complete frontend applications with Next.js, React, TypeScript. Includes auth, state management, and deployment.',
    price: '12000.00',
    timeline: '4-12 weeks',
  },
];

export const servicesStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Frontend Development & Consulting',
  provider: personStructuredData,
  areaServed: {
    '@type': 'Place',
    name: 'Worldwide (Remote)',
  },
  description:
    'Performance audits, component libraries, CMS tooling, and MVP builds. I help startups ship faster, load faster, and stop depending on engineering for everything.',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Frontend Development Services',
    itemListElement: services.map((service, index) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: service.name,
        description: service.description,
        provider: personStructuredData,
      },
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: service.price,
        priceCurrency: 'USD',
        unitText: 'project',
      },
      position: index + 1,
    })),
  },
  url: `${DOMAIN_URL}${SERVICES_LINK.href}`,
};

export const servicesPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: `Services | ${FULL_NAME} - Frontend Development & Consulting`,
  description:
    'Performance audits, component libraries, CMS tooling, and MVP builds. Ship faster with a senior frontend partner.',
  url: `${DOMAIN_URL}${SERVICES_LINK.href}`,
  author: personStructuredData,
  mainEntity: servicesStructuredData,
};
