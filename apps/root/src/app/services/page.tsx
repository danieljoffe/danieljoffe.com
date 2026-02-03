import type { Metadata } from 'next';
import { servicesMetadata } from '@/data/metadata/services';
import MainContent from '@/components/MainContent';
import Hero from './Hero';
import ServicesGrid from './ServicesGrid';
import HowIWork from './HowIWork';
import WhoIWorkWith from './WhoIWorkWith';
import FAQ from './FAQ';
import CTA from './CTA';

export const metadata: Metadata = servicesMetadata;

export default function Services() {
  return (
    <MainContent>
      <Hero />
      <ServicesGrid />
      <HowIWork />
      <WhoIWorkWith />
      <FAQ />
      <CTA />
    </MainContent>
  );
}
