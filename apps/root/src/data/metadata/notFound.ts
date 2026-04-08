import { Metadata } from 'next';

export const notFoundMetadata: Metadata = {
  title: 'Page Not Found - 404',
  description:
    'The page you are looking for could not be found. Please check the URL or return to the home page.',
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: 'Page Not Found - 404',
    description:
      'The page you are looking for could not be found. Please check the URL or return to the home page.',
  },
  twitter: {
    title: 'Page Not Found - 404',
    description:
      'The page you are looking for could not be found. Please check the URL or return to the home page.',
    card: 'summary_large_image',
  },
};
