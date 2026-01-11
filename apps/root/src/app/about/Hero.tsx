'use client';
import Button from '@/components/units/Button';
import Container from '@/components/units/Container';
import { FULL_NAME, RESUME_URL } from '@/utils/constants';
import { onClickDownload } from '@/utils/helpers';
import { profileData } from '@/utils/profileData';
import { Download, Github, Linkedin, AtSign } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  return (
    <Container className='bg-neutral-900 text-white'>
      <div className='flex flex-col gap-4'>
        <h1 className='text-center'>About</h1>
        <div className='flex flex-col gap-4 items-center md:flex-row '>
          <div className='flex flex-col gap-2 justify-center items-center w-full max-w-[16rem]'>
            <Image
              src='/images/daniel-joffe-profile.png'
              alt={FULL_NAME}
              title={FULL_NAME}
              width={275}
              height={275}
              className='rounded-full min-h-60 min-w-60'
              priority={true}
              fetchPriority='high'
              sizes='(max-width: 640px) 12rem, (max-width: 768px) 14rem, 16rem'
              decoding='async'
            />
          </div>
          <div className='flex flex-col gap-2 text-center md:text-left'>
            <p>Hello, I&apos;m {FULL_NAME},</p>
            <p>
              I&apos;m a frontend engineer with 8+ years of experience
              specializing in performance optimization and component
              architecture. I&apos;ve reduced load times by 80%, built design
              systems adopted across entire organizations, and mentored
              developers to promotions. Currently completing my CS degree at WGU
              while taking on contract work—available for senior frontend or
              full-stack roles.
            </p>
            <div className='flex flex-col gap-2 items-center md:items-start'>
              <p>You can connect with me on:</p>
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
                >
                  <Github absoluteStrokeWidth={true} />
                </Button>
                <Button
                  size='sm'
                  variant='icon'
                  aria-label='Download Resume (PDF)'
                  title='Download Resume'
                  name='download resume'
                  onClick={onClickDownload({
                    download: 'daniel-joffe.resume.pdf',
                    href: RESUME_URL,
                  })}
                >
                  <Download absoluteStrokeWidth={true} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
