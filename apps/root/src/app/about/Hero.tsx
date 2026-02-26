'use client';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import { FULL_NAME } from '@/utils/constants';
import Image from 'next/image';
import SocialLinks from '@/components/SocialLinks';

export default function Hero() {
  return (
    <Section
      aria-labelledby='about-me-name'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h1 className='text-center'>Building Without Friction</h1>
        <Stack direction='vertical' gap='md' className='md:flex-row md:gap-8'>
          <Image
            src='/images/daniel-joffe-profile.png'
            alt={FULL_NAME}
            title={FULL_NAME}
            width={200}
            height={200}
            className='rounded-full size-[12.5rem] contained border border-foreground-muted self-center md:self-start'
            sizes='200px'
            fetchPriority='high'
            preload={true}
            decoding='async'
            loading='eager'
          />
          <Stack
            direction='vertical'
            gap='md'
            className='text-center md:text-left'
          >
            <p className='uppercase tracking-wide font-medium'>
              Daniel Joffe, <br />
              Senior Frontend Engineer
            </p>
            <p>
              I specialize in building fast, accessible interfaces and scalable
              design systems that empower teams and delight users.
            </p>
            <p>
              For over 8 years, I&apos;ve focused on one thing: removing
              friction. Simplifying complex systems, streamlining workflows, and
              helping teams turn whiteboard ideas into real-world solutions,
              faster, with less effort.
            </p>
            <p>
              Explore my journey below, and let&apos;s discuss how I can help
              your team.
            </p>
            <SocialLinks />
          </Stack>
        </Stack>
      </PageContainer>
    </Section>
  );
}
