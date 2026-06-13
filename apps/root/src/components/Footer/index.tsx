import Link from 'next/link';
import { AtSign, Download, Github, Linkedin, ChevronRight } from 'lucide-react';
import { Text } from '@danieljoffe/shared-ui/Text';
import {
  FOCUS_RING,
  FOCUS_RING_OFFSET,
} from '@danieljoffe/shared-ui/styles/formStyles';
import { profileData } from '@/data/profileData';
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
  },
  {
    href: profileData.social.linkedin,
    label: 'Visit LinkedIn Profile',
    icon: Linkedin,
  },
  {
    href: profileData.social.github,
    label: 'Visit GitHub Profile',
    icon: Github,
  },
  {
    href: RESUME_URL,
    label: 'Download Resume (PDF)',
    icon: Download,
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
          </div>
          <div className='flex items-center gap-1'>
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                aria-label={label}
                title={label.replace(/^(Send |Visit |Download )/, '')}
                className={`p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
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
            className={`flex items-center gap-1 rounded-sm ${FOCUS_RING} ${FOCUS_RING_OFFSET}`}
          >
            <Text variant='meta' as='span'>
              Browse the design system
            </Text>
            <Text
              variant='meta'
              as='span'
              className='inline-flex items-center gap-1 text-text-secondary hover:underline'
            >
              ui.danieljoffe.com
              <ChevronRight className='h-3 w-3' />
            </Text>
          </a>
        </div>
      </div>
    </footer>
  );
}
