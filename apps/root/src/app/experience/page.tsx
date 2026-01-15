import Container from '@/components/Container';
import { experienceRecords } from '@/data/experienceThumbnails';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import { Metadata } from 'next';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import Script from 'next/script';
import { headers } from 'next/headers';

const experienceList = Object.values(experienceRecords);
export const metadata: Metadata = experienceRootMetadata;

export default async function ExperiencePage() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <>
      <Container>
        <div className='flex flex-col gap-4'>
          <header>
            <h1>Experience</h1>
            <p>
              An overview of my professional journey as a frontend
              engineer—covering key roles, impactful projects, and the technical
              expertise I bring to building performant, user-focused web
              applications.
            </p>
          </header>
          <section aria-labelledby='experience-heading'>
            <h2 id='experience-heading' className='sr-only'>
              Portfolio Experience section
            </h2>
            <ContentGrid>
              {experienceList.map((data, index) => (
                <li key={data.slug}>
                  <PostThumbnail {...data} index={index} />
                </li>
              ))}
            </ContentGrid>
          </section>
        </div>
      </Container>
      <Script
        id='experience-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(experienceRootStructuredData),
        }}
        nonce={nonce}
      />
    </>
  );
}
