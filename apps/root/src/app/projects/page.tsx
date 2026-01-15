import Container from '@/components/Container';
import { Metadata } from 'next';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import Script from 'next/script';
import { headers } from 'next/headers';

const projectsList = Object.values(projectsRecords);
export const metadata: Metadata = projectRootMetadata;

export default async function Projects() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <>
      <Container>
        <div className='flex flex-col gap-4'>
          <header>
            <h1>Projects</h1>
            <p>
              Case studies and projects showcasing performance optimization,
              component architecture, and full-stack development. Each project
              includes the challenge, my approach, and measurable outcomes.
            </p>
          </header>
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
        </div>
      </Container>
      <Script
        id='projects-structured-data'
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(projectsRootStructuredData),
        }}
        nonce={nonce}
      />
    </>
  );
}
