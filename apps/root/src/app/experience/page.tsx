import { Metadata } from 'next';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experienceRootStructuredData } from '@/data/structuredData/experience';
import { experienceRootMetadata } from '@/data/metadata/experience';
import {
  Stack,
  PageContainer,
  Section,
  Grid,
} from '@danieljoffe.com/shared-ui';
import PostThumbnail from '@/components/PostThumbnail';
import MainContent from '@/components/MainContent';

const experienceList = Object.values(experienceRecords);
export const metadata: Metadata = experienceRootMetadata;

export default function ExperiencePage() {
  return (
    <MainContent>
      <Section className='min-h-min max-h-max'>
        <PageContainer>
          <Stack direction='vertical' gap='md'>
            <header className='text-center'>
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
          </Stack>
        </PageContainer>

        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(experienceRootStructuredData).replace(
              /</g,
              '\\u003c'
            ),
          }}
        />
      </Section>
    </MainContent>
  );
}
