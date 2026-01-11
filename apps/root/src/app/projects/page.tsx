import Container from '@/components/units/Container';
import { Metadata } from 'next';
import WorkItem from './Item';
import { Link } from 'next-transition-router';
import { pagesRecords } from './constants';
import { projectsMetadata } from './metadata';
import UnsplashImage from '@/components/assembled/UnsplashImage';
const projectsList = Object.values(pagesRecords);

export const metadata: Metadata = projectsMetadata;

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
          <div
            className={[
              'grid grid-cols-1 md:grid-cols-2 md:grid-rows-2',
              'text-white max-w-[30rem] mx-auto md:max-w-full',
              'gap-8',
            ].join(' ')}
            aria-label='Project portfolio'
          >
            {projectsList.map(
              ({ slug, link, description, cover, backgroundColor }, index) => (
                <article
                  key={slug}
                  className={[
                    'flex flex-col overflow-hidden rounded-md transition',
                    'shadow-md/10 ease-in-out duration-300',
                    'hover:scale-102 hover:shadow-lg/30',
                  ].join(' ')}
                >
                  <UnsplashImage
                    src={cover.src}
                    alt={cover.alt}
                    origin={cover.origin}
                    creator={cover.creator}
                    priority={index < 2}
                    fetchPriority={index < 2 ? 'high' : 'low'}
                    blurHash={cover.blurHash}
                    width={400}
                    height={225}
                  />
                  <Link
                    href={link.href}
                    className={[
                      'row-span-1 col-span-1',
                      backgroundColor,
                      'overflow-hidden',
                      'shadow-lg',
                    ].join(' ')}
                    aria-label={`View ${link.label} project details`}
                  >
                    <WorkItem
                      name={link.label as string}
                      description={description as string}
                    />
                  </Link>
                </article>
              )
            )}
          </div>
        </section>
      </div>
    </Container>
  );
}
