'use client';

import { Download, Github, Linkedin, Mail } from 'lucide-react';
import {
  EMAIL_ADDRESS,
  GITHUB_PROFILE_URL,
  LINKEDIN_PROFILE_URL,
  RESUME_URL,
} from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';
import { analytics } from '@/lib/analytics';
import Button from '@/components/Button';

export default function ResumeActions() {
  return (
    <div className='flex flex-wrap items-center gap-3 print:hidden'>
      <Button
        variant='primary'
        size='sm'
        name='download-resume-pdf'
        aria-label='Download résumé as PDF'
        onClick={() => {
          analytics.ctaClick('resume_download', RESUME_URL);
          downloadResume();
        }}
      >
        <Download className='h-4 w-4' />
        Download PDF
      </Button>
      <Button
        as='link'
        href={`mailto:${EMAIL_ADDRESS}`}
        variant='secondary'
        size='sm'
        aria-label={`Email ${EMAIL_ADDRESS}`}
        onClick={() =>
          analytics.ctaClick('email_resume', `mailto:${EMAIL_ADDRESS}`)
        }
      >
        <Mail className='h-4 w-4' />
        Email
      </Button>
      <Button
        as='link'
        href={LINKEDIN_PROFILE_URL}
        target='_blank'
        variant='secondary'
        size='sm'
        aria-label='LinkedIn profile (opens in a new tab)'
        onClick={() =>
          analytics.ctaClick('linkedin_resume', LINKEDIN_PROFILE_URL)
        }
      >
        <Linkedin className='h-4 w-4' />
        LinkedIn
      </Button>
      <Button
        as='link'
        href={GITHUB_PROFILE_URL}
        target='_blank'
        variant='secondary'
        size='sm'
        aria-label='GitHub profile (opens in a new tab)'
        onClick={() => analytics.ctaClick('github_resume', GITHUB_PROFILE_URL)}
      >
        <Github className='h-4 w-4' />
        GitHub
      </Button>
    </div>
  );
}
