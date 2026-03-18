import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import { Rocket, Handshake, BookOpen, Cog, TrendingUp } from 'lucide-react';

export default function Mantra() {
  return (
    <Section aria-labelledby='mantra-heading' className='min-h-min max-h-max'>
      <PageContainer>
        <h2 id='mantra-heading' className='text-center'>
          Mantra
        </h2>
        <p>
          I thrive at the intersection of technical and business teams —
          simplifying complex systems, removing friction, and investing in the
          people around me. When teams succeed, products succeed.
        </p>

        <h3 className='text-center'>The Through-Line: Evolution of Impact</h3>
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
              <Rocket
                className='size-6 text-brand-500 shrink-0 mt-1'
                absoluteStrokeWidth={true}
              />
              <div>
                <h4>Winc</h4>
                <p> Marketing velocity and brand transformation</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2'>
            <Stack direction='horizontal' gap='sm'>
              <Handshake
                className='size-6 text-brand-500 shrink-0 mt-1'
                absoluteStrokeWidth={true}
              />
              <div>
                <h4>Internet Brands</h4>
                <p> Team leadership and regulatory compliance</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-3'>
            <Stack direction='horizontal' gap='sm'>
              <BookOpen
                className='size-6 text-brand-500 shrink-0 mt-1'
                absoluteStrokeWidth={true}
              />
              <div>
                <h4>Library Corporation</h4>
                <p> Domain specialization and accessibility</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-4'>
            <Stack direction='horizontal' gap='sm'>
              <Cog
                className='size-6 text-brand-500 shrink-0 mt-1'
                absoluteStrokeWidth={true}
              />
              <div>
                <h4>FightCamp</h4>
                <p> Infrastructure scaling and team empowerment</p>
              </div>
            </Stack>
          </li>
          <li className='col-span-4 col-start-2 md:col-start-5'>
            <Stack direction='horizontal' gap='sm'>
              <TrendingUp
                className='size-6 text-brand-500 shrink-0 mt-1'
                absoluteStrokeWidth={true}
              />
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
      </PageContainer>
    </Section>
  );
}
