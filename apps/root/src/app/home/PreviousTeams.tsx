import { PageContainer, Section } from '@danieljoffe.com/shared-ui';
import PreviousTeamsGrid from './PreviousTeamsGrid';

export default function PreviousTeams() {
  return (
    <Section
      aria-labelledby='previous-teams-heading'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h2 className='text-center' id='previous-teams-heading'>
          Teams I&apos;ve worked with
        </h2>

        <div className='text-center max-w-lg mx-auto'>
          <p>
            I&apos;ve worked with these companies to build fast, beautiful, and
            inclusive digital experiences.
          </p>
        </div>

        <PreviousTeamsGrid />
      </PageContainer>
    </Section>
  );
}
