import { Check } from 'lucide-react';
import {
  Card,
  Stack,
  PageContainer,
  Section,
  Grid,
  GridItem,
} from '@danieljoffe.com/shared-ui';

const services = [
  {
    icon: '🚀',
    title: 'Performance Audits & Optimization',
    description:
      'Your site is slow and users are bouncing. I diagnose the root causes—bloated bundles, unoptimized assets, layout shifts—and fix them systematically.',
    deliverables: [
      'Lighthouse & Core Web Vitals audit with prioritized action plan',
      'Implementation of fixes (lazy loading, image/video optimization, bundle analysis)',
      'Before/after metrics report',
    ],
    proof:
      'Cut mobile load times from 10s to 2s and reduced bounce rates by 39% at FightCamp.',
    timeline: '2-4 weeks',
    price: '$5,000',
  },
  {
    icon: '🔧',
    title: 'Component Libraries & Design Systems',
    description:
      'Your codebase has inconsistent UI, duplicated components, and no documentation. I build shared component systems that scale.',
    deliverables: [
      'Audited existing components for consolidation',
      'Documented component library with Storybook',
      'Contribution guidelines so your team can maintain it',
    ],
    proof:
      'Built a React component library adopted by 80% of applications at Internet Brands, then trained 7 developers to contribute.',
    timeline: '4-8 weeks',
    price: '$10,000',
  },
  {
    icon: '📄',
    title: 'CMS & Self-Serve Tooling',
    description:
      'Your marketing team submits engineering tickets to change a headline. I build tooling that gives non-technical teams full autonomy.',
    deliverables: [
      'CMS architecture and implementation (Storyblok, Contentful, or custom)',
      'Composable page builder components',
      'Training and documentation for your team',
    ],
    proof:
      'Built CMS tooling that let marketing launch 200+ landing pages in 2 months at Winc, and reduced engineering requests by 80% at FightCamp.',
    timeline: '3-6 weeks',
    price: '$8,000',
  },
  {
    icon: '💻',
    title: 'MVP & Product Frontend Builds',
    description:
      'You have a backend or an idea and need a production-quality frontend—fast. I architect and build complete frontend applications.',
    deliverables: [
      'Frontend architecture (Next.js, React, TypeScript)',
      'Responsive, accessible UI implementation',
      'Authentication, state management, API integration',
      'Deployment and handoff documentation',
    ],
    proof:
      'Built a logistics dashboard MVP with Next.js and AWS Cognito auth for a seed-stage venture in 3 months.',
    timeline: '4-12 weeks',
    price: '$12,000',
  },
];

export default function ServicesGrid() {
  return (
    <Section
      aria-labelledby='services-grid-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <h2 id='services-grid-heading' className='sr-only'>
          Services
        </h2>
        <Grid as='ul' cols={1} gap='lg' className='md:grid-cols-2'>
          {services.map((service, index) => (
            <GridItem key={index} as='li'>
              <Card padding='lg' elevated className='h-full'>
                <Stack direction='vertical' gap='md'>
                  <Stack direction='horizontal' gap='sm' align='center'>
                    <span className='text-2xl' aria-hidden='true'>
                      {service.icon}
                    </span>
                    <h3 className='!mb-0'>{service.title}</h3>
                  </Stack>
                  <p>{service.description}</p>
                  <div>
                    <p className='font-bold mb-2'>What you get:</p>
                    <ul className='space-y-2'>
                      {service.deliverables.map((item, i) => (
                        <li key={i} className='text-sm flex items-start gap-2'>
                          <Check
                            className='w-4 h-4 text-success flex-shrink-0 mt-0.5'
                            aria-hidden='true'
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className='text-sm italic border-l-2 border-l-accent pl-3'>
                    {service.proof}
                  </p>
                  <Stack
                    direction='horizontal'
                    gap='md'
                    className='pt-4 border-t border-border'
                  >
                    <p className='text-sm'>
                      <strong>Timeline:</strong> {service.timeline}
                    </p>
                    <p className='text-sm'>
                      <strong>Starting at:</strong> {service.price}
                    </p>
                  </Stack>
                </Stack>
              </Card>
            </GridItem>
          ))}
        </Grid>
      </PageContainer>
    </Section>
  );
}
