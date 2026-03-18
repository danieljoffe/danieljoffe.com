'use client';

import { Stack } from '@danieljoffe.com/shared-ui';
import Button from './Button';
import { profileData } from '@/data/profileData';
import { analytics } from '@/lib/analytics';
import { PROJECTS_LINK } from '@/utils/constants';
import { AtSign, Download, Github, Linkedin } from 'lucide-react';
import { downloadResume } from '@/utils/helpers';

export default function SocialLinks() {
  return (
    <Stack direction='vertical' align='center' className='md:items-start'>
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
          className='hover:text-brand-500'
          onClick={() => {
            analytics.ctaClick('click_email_message', PROJECTS_LINK.href);
          }}
        >
          <AtSign className='size-5' absoluteStrokeWidth={true} />
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
          className='hover:text-brand-500'
          onClick={() => {
            analytics.ctaClick('visit_linkedin_profile', PROJECTS_LINK.href);
          }}
        >
          <Linkedin className='size-5' absoluteStrokeWidth={true} />
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
          className='hover:text-brand-500'
          onClick={() => {
            analytics.ctaClick('visit_github_profile', PROJECTS_LINK.href);
          }}
        >
          <Github className='size-5' absoluteStrokeWidth={true} />
        </Button>
        <Button
          size='sm'
          variant='bare'
          aria-label='Download Resume (PDF)'
          title='Download Resume'
          className='hover:text-brand-500'
          name='download resume'
          onClick={() => {
            analytics.ctaClick('download_resume', PROJECTS_LINK.href);
            downloadResume();
          }}
        >
          <Download className='size-5' absoluteStrokeWidth={true} />
        </Button>
      </Stack>
    </Stack>
  );
}
