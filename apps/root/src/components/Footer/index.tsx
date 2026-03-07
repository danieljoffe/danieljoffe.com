import Link from 'next/link';
import { PageContainer, Stack } from '@danieljoffe.com/shared-ui';
import { profileData } from '@/data/profileData';
import {
  FULL_NAME,
  NAV_LINKS,
  AUDIT_LINK,
  STORYBOOK_URL,
  RESUME_URL,
} from '@/utils/constants';
import { AtSign, Download, Github, Linkedin } from 'lucide-react';

const currentYear = new Date().getFullYear();

const linkClasses =
  'text-sm lowercase font-semibold hover:text-accent transition-colors';
const iconLinkClasses =
  'p-2 hover:text-accent transition-colors inline-flex items-center justify-center';

export default function Footer() {
  return (
    <footer
      className='w-full bg-background-alt border-t border-border py-8 mt-auto'
      role='contentinfo'
      aria-label='Site footer'
    >
      <PageContainer>
        <Stack direction='vertical' gap='lg' align='center'>
          <Stack direction='vertical' gap='sm' align='center'>
            <p className='text-lg font-medium'>{profileData.name}</p>
            <p className='text-sm text-foreground-muted'>{profileData.title}</p>
            <p className='text-sm text-foreground-muted italic'>
              {profileData.status}
            </p>
          </Stack>

          <nav aria-label='Footer navigation'>
            <ul className='flex flex-col gap-4 items-center md:flex-row lowercase'>
              {[...NAV_LINKS, AUDIT_LINK].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClasses}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className='flex gap-1'>
            <a
              href={`mailto:${profileData.social.email}`}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Send Email'
              title='Email'
              className={iconLinkClasses}
            >
              <AtSign className='size-5' />
            </a>
            <a
              href={profileData.social.linkedin}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Visit LinkedIn Profile'
              title='LinkedIn'
              className={iconLinkClasses}
            >
              <Linkedin className='size-5' />
            </a>
            <a
              href={profileData.social.github}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Visit GitHub Profile'
              title='GitHub'
              className={iconLinkClasses}
            >
              <Github className='size-5' />
            </a>
            <a
              href={RESUME_URL}
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Download Resume (PDF)'
              title='Download Resume'
              className={iconLinkClasses}
            >
              <Download className='size-5' />
            </a>
          </div>

          <a
            href={STORYBOOK_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm hover:text-accent transition-colors inline-flex items-center gap-1'
          >
            <span className='text-foreground-muted'>
              Browse the design system
            </span>
            <span>&rarr;</span>
            <span className='text-accent'>ui.danieljoffe.com</span>
          </a>

          <p className='text-xs text-foreground-muted text-center'>
            &copy; {currentYear} {FULL_NAME}. All rights reserved.
          </p>
        </Stack>
      </PageContainer>
    </footer>
  );
}
