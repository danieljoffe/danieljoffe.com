import { Github, BookOpen } from 'lucide-react';
import { Stack } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { GITHUB_REPO_URL, STORYBOOK_URL } from '@/utils/constants';

export default function OpenSourceCallout() {
  return (
    <div className='bg-background-alt border border-border rounded-lg p-4'>
      <Stack direction='vertical' gap='sm'>
        <p className='text-sm text-foreground'>
          This portfolio is open source. Explore the code or browse the
          component library.
        </p>
        <Stack direction='horizontal' gap='sm' className='flex-wrap'>
          <Button
            as='link'
            href={GITHUB_REPO_URL}
            variant='secondary'
            target='_blank'
            aria-label='View source code on GitHub'
          >
            <Github className='h-4 w-4' aria-hidden='true' />
            <span>View Source</span>
          </Button>
          <Button
            as='link'
            href={STORYBOOK_URL}
            variant='secondary'
            target='_blank'
            aria-label='Browse UI component library on Storybook'
          >
            <BookOpen className='h-4 w-4' aria-hidden='true' />
            <span>Component Library</span>
          </Button>
        </Stack>
      </Stack>
    </div>
  );
}
