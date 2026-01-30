import type { Metadata } from 'next';
import { homeMetadata } from '@/data/metadata/home';
import Hero from './home/Hero';
import PreviousTeams from './home/PreviousTeams';
import Achievements from './home/Achievements';
import Methodologies from './home/Methodologies';
import CTA from './home/CTA';
import MainContent from '@/components/MainContent';

export const metadata: Metadata = homeMetadata;

export default function Index() {
  return (
    <MainContent>
      <Hero />
      <PreviousTeams />
      <Achievements />
      <Methodologies />
      <CTA />
    </MainContent>
  );
}
