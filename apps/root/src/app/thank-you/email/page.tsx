import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ABOUT_LINK, HOME_LINK } from '@/utils/constants';
import Button from '@/components/Button';

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
    <div className='max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 md:py-14'>
      <div className='flex flex-col items-center justify-center gap-4'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-center'>Thank you for reaching out!</h1>
          <p className='text-lg text-center mb-2'>
            I appreciate you taking the time to reach out.
            <br />
            I&apos;ll get back to you as soon as possible.
          </p>
        </div>
        <Button
          as='link'
          href={HOME_LINK.href}
          aria-label='Return to home page'
        >
          Back to home
        </Button>
      </div>
    </div>
  );
}
