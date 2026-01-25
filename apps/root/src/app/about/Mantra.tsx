import { Stack } from '@danieljoffe.com/ui';
import Container from '@/components/Container';
import Section from '@/components/Section';

export default function Mantra() {
  return (
    <Section ariaLabelBy='mantra-heading'>
      <Container>
        <h2 id='mantra-heading'>Mantra</h2>
        <p>
          I&apos;m driven by the challenge of making complex systems simple and
          empowering teams to do their best work. As a natural collaborator, I
          thrive in cross-functional environments where I can translate between
          technical and business needs. My leadership style is rooted in
          mentorship. I believe in investing in people&apos;s growth because
          when teams succeed, products succeed.
        </p>

        <h3>The Through-Line: Evolution of Impact</h3>
        <p>
          Looking back, each role presented a fundamentally different challenge
          and there were valuable lessons learned.
        </p>
        <Stack
          as='ul'
          className='grid grid-cols-6 md:grid-cols-8 gap-4 !my-4 list-none'
        >
          <li className='col-span-4 col-start-2 md:col-start-1'>
            <Stack direction='horizontal' gap='sm'>
              <p className='text-2xl'>🚀</p>
              <div>
                <h4>Winc</h4>
                <p> Marketing velocity and brand transformation</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2'>
            <Stack direction='horizontal' gap='sm'>
              <p className='text-2xl'>🤝</p>
              <div>
                <h4>Internet Brands</h4>
                <p> Team leadership and regulatory compliance</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-3'>
            <Stack direction='horizontal' gap='sm'>
              <p className='text-2xl'>🧑‍💻</p>
              <div>
                <h4>Library Corporation</h4>
                <p> Domain specialization and accessibility</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-4'>
            <Stack direction='horizontal' gap='sm'>
              <p className='text-2xl'>⚙️</p>
              <div>
                <h4>FightCamp</h4>
                <p> Infrastructure scaling and team empowerment</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-5'>
            <Stack direction='horizontal' gap='sm'>
              <p className='text-2xl'>📈</p>
              <div>
                <h4>Current</h4>
                <p> Foundation building and strategic growth</p>
              </div>
            </Stack>
          </li>
        </Stack>

        <p>
          What&apos;s remained constant is my focus on removing bottlenecks,
          empowering teams, and driving measurable business impact through
          thoughtful technical solutions. Each experience built capabilities
          that informed the next, creating a career trajectory focused not just
          on technical growth, but on becoming the kind of engineer who makes
          everyone around them more effective.
        </p>
      </Container>
    </Section>
  );
}
