import Achievements from './home/Achievements';
import Methodologies from './home/Methodologies';
import PreviousTeams from './home/PreviousTeams';
import Hero from './home/Hero';
import CTA from './home/CTA';
import type { Metadata } from 'next';
import { homeMetadata } from '@/data/metadata/home';

export const metadata: Metadata = homeMetadata;

export default function Index() {
  return (
    <>
      <Hero />
      <section aria-labelledby='previous-teams-heading'>
        <PreviousTeams />
      </section>
      <section aria-labelledby='achievements-heading'>
        <Achievements />
      </section>
      <section aria-labelledby='methodologies-heading'>
        <Methodologies />
      </section>
      <section aria-labelledby='cta-heading'>
        <CTA />
      </section>
    </>
  );
}
