import { Metadata } from 'next';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectRootMetadata } from '@/data/metadata/project';
import { projectsRootStructuredData } from '@/data/structuredData/project';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import MainContent from '@/components/MainContent';
import OpenSourceCallout from './OpenSourceCallout';

const projectsList = Object.values(projectsRecords);
export const metadata: Metadata = projectRootMetadata;

export default function Projects() {
  return (
    <MainContent>
      <section className='relative px-6 lg:px-0'>
        <header className='text-center mb-8'>
          <h1 className='text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary'>
            Projects
          </h1>
          <p className='mt-3 text-text-secondary max-w-xl mx-auto'>
            Case studies and projects showcasing performance optimization,
            component architecture, and full-stack development. Each project
            includes the challenge, my approach, and measurable outcomes.
          </p>
        </header>

        <OpenSourceCallout />

        <ContentGrid className='mt-8'>
          {projectsList.map((data, index) => (
            <li key={data.slug}>
              <PostThumbnail {...data} index={index} />
            </li>
          ))}
        </ContentGrid>
      </section>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(projectsRootStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
    </MainContent>
  );
}
