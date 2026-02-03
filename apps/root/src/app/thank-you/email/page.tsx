import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageContainer, Stack } from '@danieljoffe.com/ui';

import type { Metadata } from 'next';
import Button from '@/components/Button';
import { ABOUT_LINK, HOME_LINK } from '@/utils/base';

export const metadata: Metadata = {
  title: 'Thank You - Message Received',
  description: `Thank you for reaching out to Daniel Joffe. Your message has been received and I'll get back to you as soon as possible.`,
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: '/thank-you/email',
  },
  openGraph: {
    title: 'Thank You - Message Received',
    description: `Thank you for reaching out to Daniel Joffe. Your message has been received and I'll get back to you as soon as possible.`,
    url: `https://danieljoffe.com/thank-you/email`,
  },
  twitter: {
    title: 'Thank You - Message Received',
    description: `Thank you for reaching out to Daniel Joffe. Your message has been received and I'll get back to you as soon as possible.`,
  },
};

export default async function ThankYouEmail() {
  const referer = (await headers()).get('referer');
  if (!referer || ![ABOUT_LINK.href].includes(new URL(referer).pathname)) {
    redirect(HOME_LINK.href);
  }

  return (
    <PageContainer>
      <Stack direction='vertical' align='center' justify='center' gap='md'>
        <Stack direction='vertical' gap='sm'>
          <h1 className='text-center'>Thank you for reaching out!</h1>
          <p className='text-lg text-center mb-2'>
            I appreciate you taking the time to reach out.
            <br />
            I&apos;ll get back to you as soon as possible.
          </p>
        </Stack>

        <Button
          as='link'
          href={HOME_LINK.href}
          aria-label='Return to home page'
        >
          Back to home
        </Button>
      </Stack>
    </PageContainer>
  );
}
