import { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { Stack, PageContainer, Section } from '@danieljoffe.com/ui';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import MainContent from '@/components/MainContent';

const experienceList = Object.values(experienceRecords);
export const metadata: Metadata = experienceRootMetadata;

export default async function ExperiencePage() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <MainContent>
      <Section className='min-h-min max-h-max'>
        <PageContainer>
          <Stack direction='vertical' gap='md'>
            <header>
              <h1>Experience</h1>
              <p>
                An overview of my professional journey as a frontend
                engineer—covering key roles, impactful projects, and the
                technical expertise I bring to building performant, user-focused
                web applications.
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
          </Stack>
        </PageContainer>

        <Script
          id='experience-structured-data'
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(experienceRootStructuredData),
          }}
          nonce={nonce}
        />
      </Section>
    </MainContent>
  );
}
