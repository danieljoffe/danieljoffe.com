import Container from '@/components/units/Container';

export default function TechnicalExpertise() {
  return (
    <Container>
      <div className='flex flex-col gap-4'>
        <h2 id='technical-expertise-heading'>Technical Expertise</h2>
        <ul className='list-none space-y-2'>
          <li>
            <p>
              <strong>Frontend:</strong> React, TypeScript, Vue.js, Nuxt.js,
              Next.js, Angular, HTML5, CSS3, Tailwind CSS
            </p>
          </li>
          <li>
            <p>
              <strong>Backend:</strong> Node.js, Express, REST APIs, AWS (S3,
              Cognito), PostgreSQL
            </p>
          </li>
          <li>
            <p>
              <strong>Tools:</strong> Jest, Cypress, Storybook, Webpack, Git,
              CI/CD, Lighthouse, WCAG
            </p>
          </li>
          <li>
            <p>
              <strong>Specializations:</strong> Performance Optimization,
              Component Libraries, Design Systems, Accessibility
            </p>
          </li>
        </ul>
      </div>
    </Container>
  );
}
