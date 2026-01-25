import { Stack, PageContainer, Section } from '@danieljoffe.com/ui';

export default function TechnicalExpertise() {
  return (
    <Section
      aria-labelledby='technical-expertise-heading'
      className='min-h-min max-h-max'
    >
      <PageContainer>
        <h2 id='technical-expertise-heading'>Technical Expertise</h2>
        <Stack as='ul' direction='vertical' gap='sm' className='list-none'>
          <li>
            <p>
              <strong className='font-bold'>Frontend:</strong>{' '}
              <br className='md:hidden' /> React, TypeScript, Vue.js, Nuxt.js,
              Next.js, Angular, HTML5, CSS3, Tailwind CSS
            </p>
          </li>
          <li>
            <p>
              <strong className='font-bold'>Backend:</strong>{' '}
              <br className='md:hidden' /> Node.js, Express, REST APIs, AWS (S3,
              Cognito), PostgreSQL
            </p>
          </li>
          <li>
            <p>
              <strong className='font-bold'>Tools:</strong>{' '}
              <br className='md:hidden' /> Jest, Cypress, Storybook, Webpack,
              Git, CI/CD, Lighthouse, WCAG
            </p>
          </li>
          <li>
            <p>
              <strong className='font-bold'>Specializations:</strong>{' '}
              <br className='md:hidden' /> Performance Optimization, Component
              Libraries, Design Systems, Accessibility
            </p>
          </li>
        </Stack>
      </PageContainer>
    </Section>
  );
}
