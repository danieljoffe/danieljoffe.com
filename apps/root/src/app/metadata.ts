import { Metadata } from 'next';

export const rootMetadata: Metadata = {
  title: {
    default: 'Daniel Joffe | Senior Frontend Engineer',
    template: '%s | Daniel Joffe - Senior Frontend Engineer',
  },
  description:
    'Senior Frontend Engineer specializing in performance optimization and component architecture. Reduced load times by 80%, built design systems adopted across organizations. Available for senior frontend or full-stack roles.',
  keywords: [
    'Daniel Joffe',
    'Full-Stack Engineer',
    'Software Engineer',
    'React Developer',
    'Angular Developer',
    'Frontend Developer',
    'Backend Developer',
    'Web Development',
    'JavaScript',
    'TypeScript',
    'Node.js',
    'Infrastructure',
    'Performance Optimization',
    'Technical Leadership',
    'Portfolio',
  ],
  authors: [{ name: 'Daniel Joffe' }],
  creator: 'Daniel Joffe',
  publisher: 'Daniel Joffe',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://danieljoffe.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://danieljoffe.com',
    title: 'Daniel Joffe | Senior Frontend Engineer',
    description:
      'Senior Frontend Engineer specializing in performance optimization and component architecture. 8+ years of experience building fast, accessible web applications.',
    siteName: 'Daniel Joffe',
    images: [
      {
        url: '/images/daniel-joffe-profile.png',
        width: 800,
        height: 800,
        alt: 'Daniel Joffe - Full-Stack Engineer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Daniel Joffe | Senior Frontend Engineer',
    description:
      'Senior Frontend Engineer specializing in performance optimization and component architecture. Available for senior roles.',
    images: ['/images/daniel-joffe-profile.png'],
    creator: '@danieljoffe',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/mstile-150x150.png', sizes: '150x150', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [{ rel: 'icon', url: '/favicon.ico' }],
  },
  manifest: '/site.webmanifest',
  other: {
    'theme-color': '#0056b3',
    'msapplication-TileColor': '#0056b3',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'https://danieljoffe.com',
  },
};
