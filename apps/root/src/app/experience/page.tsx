import { Metadata } from 'next';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { experienceRootMetadata } from '@/data/metadata/experience';
import { Grid } from '@danieljoffe.com/shared-ui';
import PostThumbnail from '@/components/PostThumbnail';
import MainContent from '@/components/MainContent';

const experienceList = Object.values(experienceRecords);
export const metadata: Metadata = experienceRootMetadata;

export default function ExperiencePage() {
  return (
    <MainContent>
      <section className='relative px-6 lg:px-0'>
        <header className='text-center mb-8'>
          <h1 className='text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary'>
            Experience
          </h1>
          <p className='mt-3 text-text-secondary max-w-xl mx-auto'>
            An overview of my professional journey as a frontend
            engineer—covering key roles, impactful projects, and the technical
            expertise I bring to building performant, user-focused web
            applications.
          </p>
        </header>

        <Grid as='ul' cols={0} className='grid-cols-1 md:grid-cols-2'>
          {experienceList.map((data, index) => (
            <li
              key={data.slug}
              className={
                index === experienceList.length - 1
                  ? 'md:col-span-2 max-h-[40rem]'
                  : ''
              }
            >
              <PostThumbnail {...data} index={index} />
            </li>
          ))}
        </Grid>
      </section>

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(experienceRootStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
    </MainContent>
  );
}
