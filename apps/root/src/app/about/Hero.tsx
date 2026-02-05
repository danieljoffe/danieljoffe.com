'use client';
import Button from '@/components/Button';
import { Stack, PageContainer, Section } from '@danieljoffe.com/shared-ui';
import { analytics } from '@/lib/analytics';
import { PROJECTS_LINK } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { profileData } from '@/utils/profileData';
import { Download, Github, Linkedin, AtSign } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  return (
    <Section
      aria-labelledby='about-me-name'
      className='min-h-min max-h-max'
      background='alt'
    >
      <PageContainer>
        <h1 className='text-center'>About Me</h1>
        <Stack direction='vertical' gap='md' className='md:flex-row md:gap-8'>
          <Stack
            direction='horizontal'
            justify='center'
            align='start'
            className='p-[1rem]'
          >
            <Image
              src='/images/daniel-joffe-profile.png'
              alt={FULL_NAME}
              title={FULL_NAME}
              width={250}
              height={250}
              className='rounded-full min-w-[15.5rem] outline-2 outline-foreground outline-offset-[0.5rem]'
              sizes='(max-width: 640px) 12rem, (max-width: 768px) 14rem, 16rem'
              fetchPriority='high'
              preload={true}
              decoding='async'
              loading='eager'
            />
          </Stack>
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
              Explore my work below, and let&apos;s discuss how I can help your
              team.
            </p>
            <Stack
              direction='vertical'
              align='center'
              className='md:items-start'
            >
              <Stack direction='horizontal' gap='none'>
                <Button
                  size='sm'
                  variant='bare'
                  aria-label='Send Email'
                  target='_blank'
                  rel='noopener noreferrer'
                  as='link'
                  href={`mailto:${profileData.social.email}`}
                  title='Email'
                  onClick={() => {
                    analytics.ctaClick(
                      'click_email_message',
                      PROJECTS_LINK.href
                    );
                  }}
                >
                  <AtSign absoluteStrokeWidth={true} />
                </Button>
                <Button
                  size='sm'
                  variant='bare'
                  aria-label='Visit LinkedIn Profile'
                  target='_blank'
                  rel='noopener noreferrer'
                  as='link'
                  href={profileData.social.linkedin}
                  title='LinkedIn'
                  onClick={() => {
                    analytics.ctaClick(
                      'visit_linkedin_profile',
                      PROJECTS_LINK.href
                    );
                  }}
                >
                  <Linkedin absoluteStrokeWidth={true} />
                </Button>
                <Button
                  size='sm'
                  variant='bare'
                  aria-label='Visit GitHub Profile'
                  target='_blank'
                  rel='noopener noreferrer'
                  as='link'
                  href={profileData.social.github}
                  title='GitHub'
                  onClick={() => {
                    analytics.ctaClick(
                      'visit_github_profile',
                      PROJECTS_LINK.href
                    );
                  }}
                >
                  <Github absoluteStrokeWidth={true} />
                </Button>
                <Button
                  size='sm'
                  variant='bare'
                  aria-label='Download Resume (PDF)'
                  title='Download Resume'
                  name='download resume'
                  onClick={() => {
                    analytics.ctaClick('download_resume', PROJECTS_LINK.href);
                    downloadResume();
                  }}
                >
                  <Download absoluteStrokeWidth={true} />
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      </PageContainer>
    </Section>
  );
}
