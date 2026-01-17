'use client';
import Button from '@/components/Button';
import Container from '@/components/Container';
import Section from '@/components/Section';
import { analytics } from '@/lib/analytics';
import { PROJECTS_LINK } from '@/utils/base';
import { FULL_NAME } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { profileData } from '@/utils/profileData';
import { Download, Github, Linkedin, AtSign } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  return (
    <Section ariaLabelBy='about-me-name' className='bg-neutral-900 text-white'>
      <Container>
        <h1 className='text-center'>About Me</h1>
        <div className='flex flex-col gap-4 md:gap-8 md:flex-row '>
          <div className='flex items-start justify-center p-[1rem]'>
            <Image
              src='/images/daniel-joffe-profile.png'
              alt={FULL_NAME}
              title={FULL_NAME}
              width={250}
              height={250}
              className='rounded-full min-w-[15.5rem] outline-2 outline-white outline-offset-[0.5rem]'
              sizes='(max-width: 640px) 12rem, (max-width: 768px) 14rem, 16rem'
              fetchPriority='high'
              priority={true}
              decoding='async'
              loading='eager'
            />
          </div>
          <div className='flex flex-col gap-4 text-center md:text-left'>
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
            <div className='flex flex-col items-center md:items-start'>
              <div className='flex'>
                <Button
                  size='sm'
                  variant='icon'
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
                  variant='icon'
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
                  variant='icon'
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
                  variant='icon'
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
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
