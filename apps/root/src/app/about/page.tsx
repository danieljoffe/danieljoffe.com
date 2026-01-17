import type { Metadata } from 'next';
import { aboutMetadata } from '@/data/metadata/about';
import Hero from './Hero';
import TechnicalExpertise from './TechnicalExpertise';
import Timeline from './Timeline';
import Mantra from './Mantra';
import Contact from './Contact';

export const metadata: Metadata = aboutMetadata;

export default function About() {
  return (
    <>
      <Hero />
      <TechnicalExpertise />
      <Timeline />
      <Mantra />
      <Contact />
    </>
  );
}
