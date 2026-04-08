import { Metadata } from 'next';

export const notFoundMetadata: Metadata = {
  title: 'Page Not Found - 404',
  description:
    'This page does not exist. Check the URL or return to the home page.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Page Not Found - 404',
    description:
      'This page does not exist. Check the URL or return to the home page.',
  },
  twitter: {
    title: 'Page Not Found - 404',
    description:
      'This page does not exist. Check the URL or return to the home page.',
    card: 'summary_large_image',
  },
};
