import Container from '@/components/Container';

export default function Mantra() {
  return (
    <Container>
      <div className='flex flex-col gap-8'>
        <div className='flex flex-col gap-4'>
          <h2 id='mantra-heading'>Mantra</h2>
          <p>
            I&apos;m driven by the challenge of making complex systems simple
            and empowering teams to do their best work. As a natural
            collaborator, I thrive in cross-functional environments where I can
            translate between technical and business needs. My leadership style
            is rooted in mentorship. I believe in investing in people&apos;s
            growth because when teams succeed, products succeed.
          </p>
        </div>
        <div className='flex flex-col gap-4'>
          <h3>The Through-Line: Evolution of Impact</h3>
          <p>
            Looking back, each role presented a fundamentally different
            challenge and there were valuable lessons learned.
          </p>
          <ul className='grid grid-cols-1 md:grid-cols-8 gap-4'>
            <li className='col-span-1 md:col-span-5 flex gap-4'>
              <p className='text-2xl'>🚀</p>
              <div>
                <h4>Winc</h4>
                <p> Marketing velocity and brand transformation</p>
              </div>
            </li>
            <li className='col-span-1 md:col-start-2 col-span-4 flex gap-4'>
              <p className='text-2xl'>🤝</p>
              <div>
                <h4>Internet Brands</h4>
                <p> Team leadership and regulatory compliance</p>
              </div>
            </li>
            <li className='col-span-1 md:col-start-3 col-span-4 flex gap-4'>
              <p className='text-2xl'>🧑‍💻</p>
              <div>
                <h4>Library Corporation</h4>
                <p> Domain specialization and accessibility</p>
              </div>
            </li>
            <li className='col-span-1 md:col-start-4 col-span-4 flex gap-4'>
              <p className='text-2xl'>⚙️</p>
              <div>
                <h4>FightCamp</h4>
                <p> Infrastructure scaling and team empowerment</p>
              </div>
            </li>
            <li className='col-span-1 md:col-start-5 col-span-4 flex gap-4'>
              <p className='text-2xl'>📈</p>
              <div>
                <h4>Current</h4>
                <p> Foundation building and strategic growth</p>
              </div>
            </li>
          </ul>

          <p>
            What&apos;s remained constant is my focus on removing bottlenecks,
            empowering teams, and driving measurable business impact through
            thoughtful technical solutions. Each experience built capabilities
            that informed the next, creating a career trajectory focused not
            just on technical growth, but on becoming the kind of engineer who
            makes everyone around them more effective.
          </p>
        </div>
      </div>
    </Container>
  );
}
