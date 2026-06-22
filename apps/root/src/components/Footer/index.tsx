'use client';

import Link from 'next/link';
import { AtSign, Download, Github, Linkedin, ChevronRight } from 'lucide-react';
import { Text } from '@danieljoffe/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe/shared-ui/styles/formStyles';
import { profileData } from '@/data/profileData';
import { analytics } from '@/lib/analytics';
import {
  FULL_NAME,
  NAV_LINKS,
  STORYBOOK_URL,
  RESUME_URL,
} from '@/utils/constants';

const currentYear = new Date().getFullYear();

const socialLinks = [
  {
    href: `mailto:${profileData.social.email}`,
    label: 'Send Email',
    icon: AtSign,
    cta: 'footer_email_icon',
  },
  {
    href: profileData.social.linkedin,
    label: 'Visit LinkedIn Profile',
    icon: Linkedin,
    cta: 'footer_linkedin',
  },
  {
    href: profileData.social.github,
    label: 'Visit GitHub Profile',
    icon: Github,
    cta: 'footer_github',
  },
  {
    href: RESUME_URL,
    label: 'Download Resume (PDF)',
    icon: Download,
    cta: 'footer_resume',
  },
];

export default function Footer() {
  return (
    <footer
      className='px-6 lg:px-0 pt-8 pb-12 border-t border-border mt-auto'
      role='contentinfo'
      aria-label='Site footer'
    >
      <div className='max-w-3xl mx-auto space-y-8'>
        {/* Top row: name + title, social icons */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='text-center sm:text-left'>
            <p className='text-sm font-medium text-text-primary'>
              {profileData.name}
            </p>
            <Text variant='detail' className='mt-0.5'>
              {profileData.title}
            </Text>
            <a
              href={`mailto:${profileData.social.email}`}
              onClick={() =>
                analytics.ctaClick(
                  'footer_email',
                  `mailto:${profileData.social.email}`
                )
              }
              className={`mt-1 inline-block text-sm text-text-secondary hover:text-text-primary hover:underline transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET} rounded-sm`}
            >
              {profileData.social.email}
            </a>
          </div>
          <div className='flex items-center gap-1'>
            {socialLinks.map(({ href, label, icon: Icon, cta }) => (
              <a
                key={label}
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={label}
                title={label.replace(/^(Send |Visit |Download )/, '')}
                onClick={() => analytics.ctaClick(cta, href)}
                className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
              >
                <Icon className='h-4 w-4' />
              </a>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label='Footer navigation'>
          <ul className='flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-2'>
            {NAV_LINKS.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`text-sm text-text-secondary hover:text-text-primary transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET} rounded-sm`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom row: copyright + design system link */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <Text variant='meta' as='p'>
            &copy; {currentYear} {FULL_NAME}. All rights reserved.
          </Text>
          <a
            href={STORYBOOK_URL}
            target='_blank'
            rel='noopener noreferrer'
            onClick={() =>
              analytics.ctaClick('footer_storybook', STORYBOOK_URL)
            }
            className={`flex items-center gap-1 rounded-sm ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
          >
            <Text variant='meta' as='span'>
              Built with my own UI library
            </Text>
            <Text
              variant='meta'
              as='span'
              className='inline-flex items-center gap-1 text-text-secondary hover:underline'
            >
              @danieljoffe/shared-ui
              <ChevronRight className='h-3 w-3' />
            </Text>
          </a>
        </div>
      </div>
    </footer>
  );
}
