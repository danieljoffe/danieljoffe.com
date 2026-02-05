import { Metadata } from 'next';
import Script from 'next/script';
import { headers } from 'next/headers';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import MainContent from '@/components/MainContent';
import OpenSourceCallout from './OpenSourceCallout';

const projectsList = Object.values(projectsRecords);
export const metadata: Metadata = projectRootMetadata;

export default async function Projects() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <MainContent>
      <Section className='min-h-min max-h-max'>
        <PageContainer>
          <Stack direction='vertical' gap='md'>
            <header>
              <h1>Projects</h1>
              <p>
                Case studies and projects showcasing performance optimization,
                component architecture, and full-stack development. Each project
                includes the challenge, my approach, and measurable outcomes.
              </p>
            </header>

            <OpenSourceCallout />

            <section aria-labelledby='projects-heading'>
              <h2 id='projects-heading' className='sr-only'>
                Project Portfolio
              </h2>
              <ContentGrid>
                {projectsList.map((data, index) => (
                  <li key={data.slug}>
                    <PostThumbnail {...data} index={index} />
                  </li>
                ))}
              </ContentGrid>
            </section>
          </Stack>
        </PageContainer>

        <Script
          id='projects-structured-data'
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(projectsRootStructuredData),
          }}
          nonce={nonce}
        />
      </Section>
    </MainContent>
  );
}
