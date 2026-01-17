import type { Metadata } from 'next';
import { homeMetadata } from '@/data/metadata/home';
import Hero from './home/Hero';
import PreviousTeams from './home/PreviousTeams';
import Achievements from './home/Achievements';
import Methodologies from './home/Methodologies';
import CTA from './home/CTA';

export const metadata: Metadata = homeMetadata;

export default function Index() {
  return (
    <>
      <Hero />
      <PreviousTeams />
      <Achievements />
      <Methodologies />
      <CTA />
    </>
  );
}
