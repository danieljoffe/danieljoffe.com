import type { Metadata } from 'next';
import { servicesMetadata } from '@/data/metadata/services';
import { servicesPageStructuredData } from '@/data/structuredData/services';
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
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(servicesPageStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
    </MainContent>
  );
}
