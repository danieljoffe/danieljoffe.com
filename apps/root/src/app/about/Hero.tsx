'use client';
import Button from '@/components/units/Button';
import Container from '@/components/units/Container';
import { FULL_NAME, RESUME_URL } from '@/utils/constants';
import { getBase64DataUrl } from '@/utils/helpers';
import { profileData } from '@/utils/profileData';
import { Download, Github, Linkedin, AtSign } from 'lucide-react';
import Image from 'next/image';

export default function Hero() {
  return (
    <Container>
      <div className='flex flex-col gap-4'>
        <h1 className='text-center'>About</h1>
        <div className='flex flex-col gap-4 items-center md:flex-row '>
          <div className='flex flex-col gap-2 justify-center items-center w-full max-w-[16rem]'>
            <Image
              src='/images/daniel-joffe-profile.png'
              alt={FULL_NAME}
              title={FULL_NAME}
              width={300}
              height={300}
              className='rounded-full w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64'
              priority={true}
              fetchPriority='high'
              sizes='(max-width: 640px) 12rem, (max-width: 768px) 14rem, 16rem'
              placeholder='blur'
              blurDataURL={getBase64DataUrl('rgb(171, 146, 116)')}
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
                  aria-label='Download Resume PDF'
                  title='Download Resume'
                  name='download resume'
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = RESUME_URL;
                    link.download = 'daniel-joffe-resume.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
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
