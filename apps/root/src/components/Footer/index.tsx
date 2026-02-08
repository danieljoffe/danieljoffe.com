import { Github, Linkedin, Mail } from 'lucide-react';
import { Stack, PageContainer } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { NAV_LINKS } from '@/utils/base';
import { profileData } from '@/utils/profileData';
import { FULL_NAME, STORYBOOK_URL } from '@/utils/constants';

const currentYear = new Date().getFullYear();

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
            <ul className='flex flex-wrap justify-center gap-4 lowercase'>
              {NAV_LINKS.map(link => (
                <li key={link.href}>
                  <Button
                    as='link'
                    href={link.href}
                    variant='bare'
                    size='sm'
                    aria-label={`Navigate to ${link.label}`}
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <Stack direction='horizontal' gap='md' align='center'>
            <Button
              as='link'
              href={profileData.social.linkedin}
              variant='bare'
              size='sm'
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Visit LinkedIn profile'
              title='LinkedIn'
            >
              <Linkedin className='h-5 w-5' aria-hidden='true' />
            </Button>
            <Button
              as='link'
              href={profileData.social.github}
              variant='bare'
              size='sm'
              target='_blank'
              rel='noopener noreferrer'
              aria-label='Visit GitHub profile'
              title='GitHub'
            >
              <Github className='h-5 w-5' aria-hidden='true' />
            </Button>
            <Button
              as='link'
              href={`mailto:${profileData.social.email}`}
              variant='bare'
              size='sm'
              aria-label='Send email'
              title='Email'
            >
              <Mail className='h-5 w-5' aria-hidden='true' />
            </Button>
          </Stack>

          <Button
            as='link'
            href={STORYBOOK_URL}
            variant='bare'
            size='sm'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='View UI component library'
          >
            ui.danieljoffe.com
          </Button>

          <p className='text-xs text-foreground-muted text-center'>
            &copy; {currentYear} {FULL_NAME}. All rights reserved.
          </p>
        </Stack>
      </PageContainer>
    </footer>
  );
}
