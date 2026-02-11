import { PageContainer, Section } from '@danieljoffe.com/shared-ui';
import FullTimeline from './FullTimeline';
import Image from 'next/image';

export default function Timeline() {
  return (
    <Section className='min-h-min max-h-max' background='alt'>
      <PageContainer>
        <h2 id='timeline-heading' className='text-center'>
          Career Timeline
        </h2>
        <p>
          My journey began in frontend development, but I&apos;ve evolved into a
          technical leader who bridges the gap between engineering and business
          teams.
        </p>
        <h3 className='text-center'>Overview</h3>
        <p>
          From wine e-commerce to healthcare compliance to library systems, each
          role expanded my toolkit. I&apos;ve progressed from building landing
          pages to architecting component libraries used by 80% of applications,
          always focused on eliminating bottlenecks and empowering teams.
        </p>
        {/* Mobile timeline */}
        <div className='self-center flex md:hidden w-full my-[1.5rem]'>
          <Image
            src='/images/sm-timeline-light.svg'
            alt='Career timeline overview'
            width={375}
            height={667}
            className='w-full dark:hidden rounded-2xl contained border border-foreground-muted'
            sizes='100vw'
            unoptimized={true}
            fetchPriority='low'
            priority={false}
            loading='lazy'
            decoding='async'
          />
          <Image
            src='/images/sm-timeline.svg'
            alt='Career timeline overview'
            width={375}
            height={667}
            className='w-full hidden dark:block rounded-2xl contained border border-foreground-muted'
            sizes='100vw'
            unoptimized={true}
            fetchPriority='low'
            priority={false}
            loading='lazy'
            decoding='async'
          />
        </div>
        {/* Desktop timeline */}
        <div className='self-center hidden md:flex w-full my-[1.5rem]'>
          <Image
            src='/images/md-timeline-light.svg'
            alt='Career timeline overview'
            height={768}
            width={1024}
            className='w-full dark:hidden rounded-2xl contained border border-foreground-muted'
            sizes='(min-width: 768px) 50vw, (min-width: 1024px) 33vw'
            unoptimized={true}
            fetchPriority='low'
            priority={false}
            loading='lazy'
            decoding='async'
          />
          <Image
            src='/images/md-timeline.svg'
            alt='Career timeline overview'
            height={768}
            width={1024}
            className='w-full hidden dark:block rounded-2xl contained border border-foreground-muted'
            sizes='(min-width: 768px) 50vw, (min-width: 1024px) 33vw'
            unoptimized={true}
            fetchPriority='low'
            priority={false}
            loading='lazy'
            decoding='async'
          />
        </div>
        <FullTimeline />
      </PageContainer>
    </Section>
  );
}
