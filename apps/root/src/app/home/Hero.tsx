'use client';

import Button from '@/components/Button';
import Container from '@/components/Container';
import { contactFormId } from '@/app/about/Contact/Form';

import { profileData } from '@/utils/profileData';
import { ABOUT_LINK } from '@/components/Nav/Links';
import { FULL_NAME } from '@/utils/constants';
import Blob from './Blob';
import { analytics } from '@/lib/analytics';

export default function Hero() {
  return (
    <section
      className='min-h-[50vh] flex flex-col w-full overflow-hidden flex items-center justify-center md:min-h-[80vh]'
      aria-labelledby='hero-heading'
    >
      <div className='flex relative w-full h-0 top-[30%]'>
        <div className='absolute -z-1 flex w-dvw h-dvh top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 justify-center items-center'>
          <Blob />
        </div>
      </div>

      <Container>
        <div className='max-w-[32rem] flex flex-col'>
          <h2 className='text-left text-white'>hello, I&apos;m</h2>
          <h1
            id='hero-heading'
            className='text-shadow-lg text-7xl w-full text-right tracking-wide text-white'
          >
            {profileData.name}
          </h1>
          <p className='text-shadow-lg text-right text-base font-medium text-white/90 mb-2'>
            {profileData.title}
          </p>
          <p className='text-shadow-lg text-center text-lg text-white'>
            {profileData.tagline}
          </p>
          <p className='text-shadow-lg text-center text-sm text-white/80 mt-2 italic'>
            {profileData.status}
          </p>
          <div className='flex justify-center mt-4'>
            <Button
              as='link'
              href={`${ABOUT_LINK.href}?scrollTo=${contactFormId}`}
              aria-label={`Get in touch with ${FULL_NAME}`}
              id='contactMe'
              onClick={() =>
                analytics.ctaClick('lets_talk', '/about?scrollTo=contact-form')
              }
            >
              Let&apos;s Talk
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
