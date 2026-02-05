import type { Metadata } from 'next';
import { aboutMetadata } from '@/data/metadata/about';
import Hero from './Hero';
import TechnicalExpertise from './TechnicalExpertise';
import Timeline from './Timeline';
import Mantra from './Mantra';
import Contact from './Contact';
import MainContent from '@/components/MainContent';

export const metadata: Metadata = aboutMetadata;

export default function About() {
  return (
    <MainContent>
      <Hero />
      <TechnicalExpertise />
      <Timeline />
      <Mantra />
      <Contact />
    </MainContent>
  );
}
