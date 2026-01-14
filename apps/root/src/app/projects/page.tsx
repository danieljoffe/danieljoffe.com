import Container from '@/components/units/Container';
import { Metadata } from 'next';
import PostThumbnail from '@/components/PostThumbnail';
import ContentGrid from '@/components/ContentGrid';
import { projectsRecords } from '@/data/projectThumbnails';
import { projectRootMetadata } from '@/data/metadata/project';

const projectsList = Object.values(projectsRecords);
export const metadata: Metadata = projectRootMetadata;

export default function Projects() {
  return (
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
              <PostThumbnail key={data.slug} {...data} index={index} />
            ))}
          </ContentGrid>
        </section>
      </div>
    </Container>
  );
}
