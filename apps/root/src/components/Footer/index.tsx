import { Stack, PageContainer } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { profileData } from '@/utils/profileData';
import { FULL_NAME, STORYBOOK_URL } from '@/utils/constants';
import NavLinks from '@/components/Nav/Links';
import SocialLinks from '../SocialLinks';

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
            <NavLinks />
          </nav>
          <SocialLinks />

          <Button
            as='link'
            href={STORYBOOK_URL}
            variant='bare'
            size='sm'
            target='_blank'
            rel='noopener noreferrer'
            aria-label='View UI component library'
            className='hover:text-accent'
          >
            <span className='text-foreground-muted'>
              Browse the design system
            </span>
            <span>&rarr;</span>
            <span className='text-accent'>ui.danieljoffe.com</span>
          </Button>

          <p className='text-xs text-foreground-muted text-center'>
            &copy; {currentYear} {FULL_NAME}. All rights reserved.
          </p>
        </Stack>
      </PageContainer>
    </footer>
  );
}
