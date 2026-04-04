'use client';

import { AtSign, Download, Github, Linkedin } from 'lucide-react';
import { profileData } from '@/data/profileData';
import { analytics } from '@/lib/analytics';
import { PROJECTS_LINK } from '@/utils/constants';
import { downloadResume } from '@/utils/helpers';

const links = [
  {
    href: `mailto:${profileData.social.email}`,
    label: 'Send Email',
    icon: AtSign,
    analyticsId: 'click_email_message',
    external: true,
  },
  {
    href: profileData.social.linkedin,
    label: 'Visit LinkedIn Profile',
    icon: Linkedin,
    analyticsId: 'visit_linkedin_profile',
    external: true,
  },
  {
    href: profileData.social.github,
    label: 'Visit GitHub Profile',
    icon: Github,
    analyticsId: 'visit_github_profile',
    external: true,
  },
];

export default function SocialLinks() {
  return (
    <div className='flex items-center gap-1 justify-center sm:justify-start'>
      {links.map(({ href, label, icon: Icon, analyticsId }) => (
        <a
          key={label}
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={label}
          onClick={() => analytics.ctaClick(analyticsId, PROJECTS_LINK.href)}
          className='p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
        >
          <Icon className='h-4 w-4' />
        </a>
      ))}
      <button
        aria-label='Download Resume (PDF)'
        onClick={() => {
          analytics.ctaClick('download_resume', PROJECTS_LINK.href);
          downloadResume();
        }}
        className='p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer'
      >
        <Download className='h-4 w-4' />
      </button>
    </div>
  );
}
