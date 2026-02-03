import type { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
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

export default async function Services() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <MainContent>
      <Hero />
      <ServicesGrid />
      <HowIWork />
      <WhoIWorkWith />
      <FAQ />
      <CTA />
      <Script
        id='services-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(servicesPageStructuredData),
        }}
        nonce={nonce}
      />
    </MainContent>
  );
}
